import styles from "./TransactionStatus.module.scss";

export default function TransactionStatus({ message, processing, type }) {
  let typeName = "";
  switch (type) {
    case "48":
      typeName = "Payment";
      break;
    case "49":
      typeName = "Refund";
      break;
    case "50":
      typeName = "Reversal";
      break;
    default:
      break;
  }

  return (
    <div className={"transaction-status " + styles.transactionStatus}>
      <div className={styles.messageWrap}>
        <div className={styles.transactionStatusText}>
          Transaction status: {typeName}
        </div>
        {message && <div className={styles.message}>{message}</div>}
        {/* {processing && <img src={spinner} className={styles.spinner} />} */}
      </div>
    </div>
  );
}