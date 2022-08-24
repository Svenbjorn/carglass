import "./App.scss";
import { useCallback, useEffect, useState } from "react";
import ActionButton from "./ActionButton/ActionButton";
import carglassLogo from "./assets/carglassNO.svg";
import TransactionStatus from "./TransactionStatus";
import axios from "axios";

const postMessage = {
  receieved: false,
  netsEndpoint: "{nets cloud connection url}",
  paymentSite: "{this payment site}",
  trustedOrigin: "{this payment site's origin (trust issue)}",
  login: { user: "username", psw: "password" },
  terminalId: "12345678",
  type: "", // 48 Transaction, 49 Refund, 50 Reversal
  amount: "1234",
  orderID: "",
};

const status = Object.freeze({
  start: "start",
  waiting: "waiting",
  error: "error",
  done: "done",
});

function App() {
  const [currentStatus, setCurrentStatus] = useState(status.start);
  const [webSocket, setWebSocket] = useState(undefined);
  const [transactionStatus, setTransactionStatus] = useState("Logging in...");

  const[receipt,setReceipt] = useState(undefined);
  const[jsonResult,setJsonResult] = useState(undefined);

  const [postData, setPostData] = useState(postMessage);

  const netsLogin = useCallback(() => {
    const {
      receieved,
      netsEndpoint,
      login: { user, psw },
    } = postData;

    if (receieved) {
      // console.log("https://" + netsEndpoint + ":443" + "/v1/login",user)
      axios
        .post("https://" + netsEndpoint + ":443" + "/v1/login", {
          username:user,
          password:psw,
        })
        .then((response) => {
          console.log(response);
          console.log(response.data.token);
          const token = response?.data?.token;
          if (token)
            setWebSocket(
              new WebSocket(
                "wss://" + netsEndpoint + "/ws/json/?auth_token=" + token
              )
            );
        });
    }
  },[postData]);

  useEffect(() => {
    netsLogin();
  }, [postData]);

  useEffect(() => {
    const messageListener = window.addEventListener("message", (e) => {
      const data = e.data;
      console.log(data);
      if (data && data.amount && data.login && data.terminalId) {
        setPostData({ ...data, receieved: true });
        console.log("Data recieved:", { ...data, receieved: true });
        setTransactionStatus("Receieved post data");
      }
    });

    return () => {
      window.removeEventListener("message", messageListener);
    };
  }, []);

  const makeTransaction = (terminalId,type,amount,orderID)=>{
    if(webSocket)
    {
      const json = {
        NetsRequest: {
          MessageHeader: {
            $: {
              // ECRID: "' + g_posID + ' ",
              ECRID: "testEcrVendor_001",
              // ECRID: "Bot-POS1",
              // ECRID: "20220817123200",
              TerminalID: terminalId,
              VersionNumber: "1",
            },
          },
          Dfs13TransferAmount: {
            TransactionType: type,
            OperId: "0000",
            Amount1: amount,
            Amount2: "0",
            Amount3: "0",
            Type2: "48",
            Type3: "48",
            OptionalData: "",
          },
        },
      };
      console.log("Sending:", json);
      webSocket.send(JSON.stringify(json));
    }
  }

  useEffect(() => {
    if (webSocket) {
      const {terminalId,type,amount,orderID} = postData;
      webSocket.onerror = (error) => {
        console.log(error);
      };
      webSocket.onopen = (event) => {
        if(type !== "admin")
        {
          makeTransaction(terminalId,type,amount,orderID);
        }
      };
      webSocket.onmessage = async function (m) {
        // console.log(m);
        const message = await m.data.text();

        const messageObj = JSON.parse(message);
        console.log("Return-->", messageObj);

        const netsResponse = messageObj.NetsResponse;
        const {
          Dfs13DisplayText,
          Dfs13PrintText,
          Dfs13LocalMode,
          Dfs13TldReceived,
          Dfs13LastFinancialResult,
          Dfs13TerminalReady,
        } = netsResponse;
        
        // Terminal status information
        if (Dfs13DisplayText !== undefined) {
          console.log(Dfs13DisplayText._, Dfs13DisplayText.$?.TextID);
          setTransactionStatus(Dfs13DisplayText._.replaceAll("\r", "\r\n"));

          if(Dfs13DisplayText.$?.TextID === "1011") // Waiting for card..
          {
            // Do something, when waiting for card..
            setCurrentStatus(status.waiting);
          }
        }

        // Receipt-like info
        if(Dfs13PrintText !== undefined)
        {
          console.log(Dfs13PrintText.Text);
          // window.parent.postMessage({printText:Dfs13PrintText.Text},"*");
          setReceipt(Dfs13PrintText.Text);
        }

        // Final JSON format info
        if(Dfs13LocalMode !== undefined)
        {
          if(Dfs13LocalMode.ResponseCode === "00")
          {
            //SUCCESS
            setCurrentStatus(status.done);
          }
          else
          {
            //FAILED
            setCurrentStatus(status.error);
          }
          setJsonResult(Dfs13LocalMode);
        }

        // Some unknown data..
        if(Dfs13TldReceived !== undefined)
        {
          console.log("DATA:", Dfs13TldReceived);
        }

        if(Dfs13LastFinancialResult !== undefined)
        {
          console.log("Dfs13LastFinancialResult",Dfs13LastFinancialResult);
          window.parent.postMessage({netsData:Dfs13LastFinancialResult});
        }

        // The Terminal is ready again..
        if(Dfs13TerminalReady !== undefined)
        {

        }

        if (
          Dfs13DisplayText === undefined &&
          Dfs13PrintText === undefined &&
          Dfs13LocalMode === undefined &&
          Dfs13TerminalReady === undefined &&
          Dfs13LastFinancialResult === undefined &&
          Dfs13TldReceived === undefined 
        ) {
          console.log("NEW:", netsResponse);
        }
      };

      //clean up function
      return () => {
        console.log("Closing...");
        webSocket.close();
      };
    }
  }, [webSocket]);

  useEffect(()=>{
    if(receipt && jsonResult)
    {
      console.log({netsData: jsonResult, receipt:receipt});
      const data = {netsData: jsonResult, receipt:receipt}
      window.parent.postMessage(data,"*");
      setJsonResult(undefined);
      setReceipt(undefined);
    }
  },[receipt,jsonResult]);

  const adminCall = (code,optionalData = "") => {
    if (webSocket) {
      setJsonResult(undefined);
      setReceipt(undefined);
      const{terminalId} = postData;
      const json = {
        NetsRequest:{
          MessageHeader:{
            $:{
              ECRID: "testEcrVendor_001",
              TerminalID: terminalId,
              VersionNumber: "1",
            }
          },
          Dfs13Administration:{
            OperId:"0000",
            AdmCode:code,
            OptionalData:optionalData,
          }
        }
      }
      webSocket.send(JSON.stringify(json));
    }
  };

  const Transaction = ()=>(
    <div className="transaction">
      <header>
        <h1 className="header-text">
          Terminal
          <div className="border-line" />
        </h1>
      </header>
      <section>
        {/* <NetsLogo /> */}
        <TransactionStatus
          // message={message}
          type={postData.type}
          message={transactionStatus}
          processing={true}
        />
        <div className="buttons-container">
          <ActionButton
            className="cancel-button"
            disabled={currentStatus !== status.waiting}
            action={() => adminCall("12594")}
          >
            Cancel
          </ActionButton>
          <ActionButton
            className="retry-button"
            disabled={currentStatus !== status.error}
            action={() => {
              //RETRYING..
              const { terminalId, type, amount, orderID } = postData;
              makeTransaction(terminalId, type, amount, orderID);
              // retryAction();
            }}
          >
            Retry
          </ActionButton>
        </div>
      </section>
      {/* <button onClick={()=>{console.log(webSocket);}}>Test</button> */}
      <footer>
        <div className="bottom-right">
          <img className="carglass-logo" src={carglassLogo} draggable={false} />
        </div>
      </footer>
    </div>
  );

  const Administration = ()=>{
    return <div className="administration">
      <header>
        <h1 className="header-text">
          Administration
          <div className="border-line" />
        </h1>
      </header>
      <section>
        Options
        <div className="options">
          <ActionButton action={()=>{adminCall("12592")}}>End of day</ActionButton>
          <ActionButton action={()=>{adminCall("12607")}}>Load dataset</ActionButton>
          <ActionButton action={()=>{adminCall("12604")}}>Last Receipt</ActionButton>
          <ActionButton action={()=>{adminCall("12605")}}>Last result</ActionButton>
          <ActionButton action={()=>{adminCall("12598")}}>X-Report</ActionButton>
          <ActionButton action={()=>{adminCall("12599")}}>Z-Report</ActionButton>
          {/* <ActionButton>Last result</ActionButton>
          <ActionButton>Last result</ActionButton> */}
        </div>
      </section>
      <footer>
        <div className="bottom-right">
          <img className="carglass-logo" src={carglassLogo} draggable={false} />
        </div>
      </footer>
    </div>
  }

  return (
    <div className="App">
      {!["","admin"].includes(postData.type) && <Transaction />}
      {postData.type === "admin" && <Administration />}
    </div>
  );
}

export default App;
