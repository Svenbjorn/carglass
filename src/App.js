import logo from "./logo.svg";
import "./App.scss";
import { useCallback, useEffect, useMemo, useState } from "react";
import ActionButton from "./ActionButton/ActionButton";
import carglassLogo from "./assets/carglass.svg";
import TransactionStatus from "./TransactionStatus";
// import axios from 'axios';
import axiosObservable from "axios-observable";
import NetsLogo from "./NetsLogo";
import axios from "axios";

const postMessage = {
  recieved: false,
  netsEndpoint: "{nets cloud connection url}",
  paymentSite: "http://localhost:3000",
  trustedOrigin: "http://localhost:3000",
  login: { user: "test_nordia", psw: "5up3r-cloud!" },
  terminalId: "74212001",
  type: "", // 48 Transaction, 49 Refund, 50 Reversal
  amount: "1234",
};

const status = Object.freeze({
  start: "start",
  waiting: "waiting",
  error: "error",
  done: "done",
});

function App() {
  // const netsApiUrl = "ws://connectcloud-test.aws.nets.eu/ws/json";
  const [message, setMessage] = useState("");
  // const[token, setToken] = useState(undefined);
  const [currentStatus, setCurrentStatus] = useState(status.start);
  const [wsIsOpen, setWsIsOpen] = useState(false);
  const [webSocket, setWebSocket] = useState(undefined);
  const [transactionStatus, setTransactionStatus] = useState("Logging in...");
  const [n,setN] = useState(0);

  const [postData, setPostData] = useState(postMessage);

  const netsLogin = useCallback(() => {
    const {
      recieved,
      netsEndpoint,
      login: { user, psw },
    } = postData;

    if (recieved) {
      // console.log("https://" + netsEndpoint + ":443" + "/v1/login",user)
      axios
        .post("https://" + netsEndpoint + ":443" + "/v1/login", {
          username:user,
          password:psw,
        })
        .then((response) => {
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
  });

  useEffect(() => {
    netsLogin();
  }, [postData]);

  useEffect(() => {
    const messageListener = window.addEventListener("message", (e) => {
      const data = e.data;
      if (data && data.amount && data.login && data.terminalId) {
        setPostData({ ...data, recieved: true });
      }
    });

    return () => {
      window.removeEventListener("message", messageListener);
    };
  }, []);

  const makeTransaction = (terminalId,type,amount)=>{
    console.log(webSocket);
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
      const {terminalId,type,amount} = postData;
      webSocket.onerror = (error) => {
        console.log(error);
      };
      webSocket.onopen = (event) => {
        console.log(event);
        makeTransaction(terminalId,type,amount);
        setWsIsOpen(true);
      };
      webSocket.onmessage = async function (m) {
        // console.log(m);
        const message = await m.data.text();

        const messageObj = JSON.parse(message);
        console.log("Return-->", messageObj);

        const netsResponse = messageObj.NetsResponse;
        const { Dfs13DisplayText, Dfs13PrintText, Dfs13LocalMode, Dfs13TerminalReady } = netsResponse;
        
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

        // Reciept-like info
        if(Dfs13PrintText !== undefined)
        {
          console.log("Reciept",Dfs13PrintText.Text);
          window.top.postMessage({printText:Dfs13PrintText.Text},"*");
        }

        // Final JSON format info
        if(Dfs13LocalMode !== undefined)
        {
          let success = true;
          if(Dfs13LocalMode.ResponseCode === "00")
          {
            //SUCCESS
            setCurrentStatus(status.done);
          }
          else
          {
            //FAILED
            success = false;
            setCurrentStatus(status.error);
          }
          const data = {
            success,
            netsData:Dfs13LocalMode,
          };
          window.top.postMessage(data,"*");
        }

        // The Terminal is ready again..
        if(Dfs13TerminalReady !== undefined)
        {

        }

        if (Dfs13DisplayText === undefined && Dfs13PrintText === undefined && Dfs13LocalMode === undefined && Dfs13TerminalReady === undefined) {
          console.log("NEW:", netsResponse);
        }
      };

      //clean up function
      return () => {
        console.log("Closing...");
        webSocket.close();
        setWsIsOpen(false);
      };
    }
  }, [webSocket]);

  const cancelTransaction = (webSocket) => {
    if (webSocket) {
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
            AdmCode:"12598",
            OptionalData:"",
          }
        }
      }
      webSocket.send(JSON.stringify(json));
    }
  };

  return (
    <div className="App">
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
            webSocket = {webSocket}
            disabled={currentStatus !== status.waiting}
            action={()=>cancelTransaction(webSocket)}
          >
            Cancel
          </ActionButton>
          <ActionButton
            className="retry-button"
            disabled={currentStatus !== status.error}
            action={() => {
              //RETRYING..
              const {terminalId,type,amount} = postData;
              makeTransaction(terminalId,type,amount);
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
}

export default App;
