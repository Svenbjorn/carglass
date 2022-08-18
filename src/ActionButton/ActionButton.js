import styles from "./ActionButton.module.scss";

export default function ActionButton ({
  className,
  children,
  action = () => void 0,
  disabled,
  // webSocket,
}) {
  // const cancelButton = useCallback((webSocket) => {
  //   action(webSocket);
  // }, []);

  return (
    <button
      className={
        `action-button ${className} ${disabled ? styles.disabled : ""} ` +
        styles.actionButton
      }
      onClick={() => {
  
        action();
      }}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
