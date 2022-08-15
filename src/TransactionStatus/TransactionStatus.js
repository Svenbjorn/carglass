import styles from "./TransactionStatus.module.scss";
import spinner from "../assets/spin-svgrepo-com.svg";

export default function TransactionStatus({message,processing}) {

    return <div className={"transaction-status " + styles.transactionStatus}>
        <div className={styles.messageWrap}>
            {message && <div className={styles.message}>{message}</div>}
            {/* {processing && <img src={spinner} className={styles.spinner} />} */}
        </div>
    </div>
}