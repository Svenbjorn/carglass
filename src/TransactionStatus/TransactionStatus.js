import styles from "./TransactionStatus.module.scss";
import spinner from "../assets/spin-svgrepo-com.svg";

export default function TransactionStatus({ message, processing, type }) {
  let typeName = "";
  switch (type) {
    case "48":
      typeName = "payment";
      break;
    case "49":
      typeName = "refund";
      break;
    case "50":
      typeName = "reversal";
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