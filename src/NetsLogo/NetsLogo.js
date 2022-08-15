import styles from "./NetsLogo.module.scss";

export default function NetsLogo({loading = false,})
{
    return <div className={styles.netsLogo}>
        <div className={styles.dots}>
            <div className={`${styles.dot} ${styles.dot1}`}></div>
            <div className={`${styles.dot} ${styles.dot2}`}></div>
            <div className={`${styles.dot} ${styles.dot3}`}></div>
            <div className={`${styles.dot} ${styles.dot4}`}></div>
        </div>
    </div>
}