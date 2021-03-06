import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';
import {ensure, ensureEqual} from '../common/ensure';
import {Asset} from '../common/types/Asset';
import {Fee, FeeType} from '../common/types/Fee';
import {Withdrawal} from '../common/types/Withdrawal';
import {User} from '../common/types/User';
import AddressLink from './AddressLink';
import AmountControls from './AmountControls';
import Module, {ModuleStatus} from './Module';
import RefreshButton from './RefreshButton';
import Web3ClientNotDetected from './Web3ClientNotDetected';

const styles = (theme: Theme) => ({
  root: {
    maxWidth: 450,
  },
  transactionInfo: {
    marginTop: '1em',
  },
  accountInfo: {
    fontSize: '85%',
  },
  refreshButton: {
    marginTop: -2,
  },
});

type PropTypes = {
  classes: {
    root: string;
    transactionInfo: string;
    accountInfo: string;
    refreshButton: string;
  };
  user: User;
  asset: Asset;
  balance: number;
  refreshBalances: () => void;
  withdraw: ((amount: number) => Promise<Withdrawal>)|null;
  getErc20WithdrawalFee: (userId: string) => Fee|undefined;
  className?: string;
};
type State = {
  moduleStatus: ModuleStatus|null;
  amount: number;
};
class WithdrawTokens extends PureComponent<PropTypes, State> {
  constructor(props: PropTypes) {
    super(props);
    this.state = {
      moduleStatus: null,
      amount: 0,
    };
  }

  render() {
    const classes = this.props.classes;
    return (
      <Module className={this.getClassName()}
              status={this.state.moduleStatus}>
        <Typography variant="h5">
          Withdraw as ERC-20 DONUTS
        </Typography>
        <p>
          Enter the amount of DONUTS to withdraw to your Ethereum address.
        </p>
        <p>
          <b>Note:</b> You will need a little ETH to pay the gas costs to
          complete the transaction.
        </p>
        {this.renderAmountControls()}
        <div className={classes.accountInfo}>
          <div>
            {'Withdrawal fee: '}
            <b>
              {this.renderWithdrawalFee()}
            </b>
          </div>
          <div>
            {'Account balance: '}
            <b>{this.props.asset.name.format(this.props.balance)}</b>
            <RefreshButton
                className={classes.refreshButton}
                tiny={true}
                refreshBalances={this.props.refreshBalances} />
          </div>
        </div>
      </Module>
    );
  }
  
  private getClassName(): string {
    const classes = this.props.classes;
    const classNames = [classes.root];
    if (this.props.className) {
      classNames.push(this.props.className);
    }
    return classNames.join(' ');
  }

  private renderAmountControls() {
    if (this.props.withdraw) {
      return (
        <AmountControls
            label="Withdraw"
            amount={this.state.amount}
            setAmount={this.setAmount}
            action={this.withdrawAmount} />
      );
    }
    return <Web3ClientNotDetected />;
  }

  private withdrawAmount = async (amount: number) => {
    await new Promise(resolve => {
      this.setState({
        moduleStatus: new ModuleStatus(true, 'Withdrawing...'),
      }, resolve);
    });
    const withdrawal = await ensure(this.props.withdraw)(amount);
    this.setState({
      moduleStatus: new ModuleStatus(
          false,
          (<div>
            <p>
              Your have successfully withdrawn{' '}
              {withdrawal.asset.name.format(withdrawal.amount)}.
            </p>
            {this.renderTransactionLink(withdrawal)}
          </div>)),
    });
  }

  private renderTransactionLink(withdrawal: Withdrawal) {
    const txId = withdrawal.transactionId;
    if (txId && !/^queued\-tx\:/.test(txId)) {
      return (
        <div className={this.props.classes.transactionInfo}>
          {'Transaction: '}
          <AddressLink type="transaction"
                      address={txId}
                      abbreviate={true} />
        </div>
      );
    } else {
      return (
        <div className={this.props.classes.transactionInfo}>
          It may take several minutes for the transaction be broadcasted and
          mined.
        </div>
      );
    }
  }
  
  private renderWithdrawalFee(): string {
    const fee = this.props.getErc20WithdrawalFee(this.props.user.id);
    if (!fee) {
      return '\u2026';
    }
    if (fee.type == FeeType.STATIC) {
      return this.props.asset.name.format(fee.value);
    }
    ensureEqual(fee.type, FeeType.RELATIVE);
    return this.props.asset.name.format(
        Math.ceil(this.state.amount * fee.value / 10000));
  }

  private setAmount = (amount: number) => {
    this.setState({amount});
  };
}

export default withStyles(styles, {withTheme: true})(WithdrawTokens);
