import { useCallback } from "react";
import styles from "./ActionButton.module.scss";

export default function ({
  className,
  children,
  action = () => void 0,
  disabled,
}) {
  const cancelButton = useCallback(() => {
    action();
  }, []);

  return (
    <button
      className={
        `action-button ${className} ${disabled ? styles.disabled : ""} ` +
        styles.actionButton
      }
      onClick={cancelButton}
      disabled={disabled}
    >
      {children}
    </button>
  );
}