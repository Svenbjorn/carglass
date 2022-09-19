import "./App.scss";
import { useCallback, useEffect, useState } from "react";
import ActionButton from "./ActionButton/ActionButton";
import carglassLogo from "./assets/carglassNO.svg";
import TransactionStatus from "./TransactionStatus";
import axios from "axios";
import { useBeforeunload } from 'react-beforeunload';


var postMessage = {
  receieved: false,
  netsEndpoint: "{nets cloud connection url}",
  paymentSite: "{this payment site}",
  trustedOrigin: "{this payment site's origin (trust issue)}",
  login: { user: "username", psw: "password" },
  terminalId: "12345678",
  type: "", // "48" Transaction, "49" Refund, "50" Reversal, "admin" admin
  amount: "1234",
  orderID: "",
};

if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
      value: function(search, rawPos) {
          var pos = rawPos > 0 ? rawPos|0 : 0;
          return this.substring(pos, pos + search.length) === search;
      }
  });
}

var status = Object.freeze({
  start: "start",
  waiting: "waiting",
  error: "error",
  done: "done",
});

function App() {
  var [currentStatus, setCurrentStatus] = useState(status.start);
  var [webSocket, setWebSocket] = useState(undefined);
  var [transactionStatus, setTransactionStatus] = useState("Logging in...");

  const[receipt,setReceipt] = useState(undefined);
  const[jsonResult,setJsonResult] = useState(undefined);

  var [postData, setPostData] = useState(postMessage);
  var [token, setToken] = useState(undefined);

  window.addEventListener("message", (e) => {
    var data = e.data;
    if (data && data.login && data.terminalId) {
      setPostData({ ...data, receieved: true });
      setTransactionStatus("Receieved post data");
    }
  });

  var checkStatus = (token,{netsEndpoint,terminalId})=>{
    setTransactionStatus("Calling...");
    return new Promise((resolve,reject)=>{
      axios
        .get(
          "https://" +
            netsEndpoint +
            ":443/v1/terminal/" +
            terminalId +
            "?auth_token=" +
            token
        )
        .then((response) => {
          resolve(response?.data?.terminal?.terminalState);
        })
        .catch((error) => reject(error));
    })
  }

  var netsLogin = useCallback(() => {
    var {
      receieved,
      netsEndpoint,
      login: { user, psw },
    } = postData;
    
    if (receieved) {
      axios
        .post((netsEndpoint.startsWith("https://") ? "" : "https://") + netsEndpoint + ":443/v1/login", {
          username:user,
          password:psw,
        })
        .then(async (response) => {
          var token = response?.data?.token;
          setToken(token);
          if (token)
          {
            var terminalState = await checkStatus(token,postData);
            if(terminalState === "idle")
            {
              setWebSocket(
                new WebSocket(
                  "wss://" + netsEndpoint + "/ws/json/?auth_token=" + token
                )
              );
            }
            else
            {
              setTransactionStatus("Terminal state: "+terminalState);
              setCurrentStatus(status.error);
              var waitInterval = setInterval(async ()=>{
                var terminalState = await checkStatus(token,postData);
                if(terminalState === "idle")
                {
                  clearInterval(waitInterval);
                  setWebSocket(
                    new WebSocket(
                      "wss://" + netsEndpoint + "/ws/json/?auth_token=" + token
                    )
                  );
                }
                else
                {
                  setTransactionStatus("Terminal state: "+terminalState);
                }
              },5000);
            }
          }
        }).catch((error)=>{
          console.log(error);
          setTransactionStatus(error?.response?.data?.error ?? "Something went wrong when logging in.");
        });
    }
  },[postData]);

  useEffect(() => {
    netsLogin();
  }, [postData,netsLogin]);

  // useEffect(() => {
  //   setTransactionStatus("THIS WORKS..");
  //   // var messageListener = window.addEventListener("message", (e) => {
  //   //   var data = e.data;
  //   //   if (data && data.amount && data.login && data.terminalId) {
  //   //     setPostData({ ...data, receieved: true });
  //   //     console.log("Data recieved:", { ...data, receieved: true });
  //   //     setTransactionStatus("Receieved post data");
  //   //   }
  //   // });

  //   setTimeout(()=>{
  //     window.parent.postMessage("Hiiii :D","*");
  //   },2000);
  //   return () => {
  //     window.removeEventListener("message", messageListener);
  //   };


  // }, []);

  var makeTransaction = useCallback(async (terminalId,type,amount,orderID)=>{
    var terminalState = await checkStatus(token,postData);
    if(terminalState !== "idle")
    {
      setTransactionStatus("Terminal state: "+terminalState);
      setCurrentStatus(status.error);
      if(webSocket)
        webSocket.close();
      return;
    }

    if(webSocket)
    {
      if(webSocket.readyState === WebSocket.CLOSED || webSocket.readyState === WebSocket.CLOSING)
      {
        const{netsEndpoint} = postData;
        setWebSocket(new WebSocket(
          "wss://" + netsEndpoint + "/ws/json/?auth_token=" + token
        ));
        return;
      }
      var json = {
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
      webSocket.send(JSON.stringify(json));
    }
  },[postData,token,webSocket])

  function readBlob(file) {
  
    return new Promise((resolve)=>{
      // var file = files[0];
      var start = 0;
      var stop = file.size - 1;
      var reader = new FileReader();
      
      // If we use onloadend, we need to check the readyState.
      reader.onloadend = function(evt) {
          if (evt.target.readyState === FileReader.DONE) { // DONE == 2
              resolve(evt.target.result);
          }
      };
      
      var blob = file.slice(start, stop + 1);
      reader.readAsText(blob);
    })
  
  }

  useEffect(() => {
    if (webSocket) {
      var {terminalId,type,amount,orderID} = postData;
      webSocket.onerror = (error) => {
        console.log(error);
      };
      webSocket.onopen = () => {
        if(type !== "admin")
        {
          makeTransaction(terminalId,type,amount,orderID);
        }
      };
      webSocket.onmessage = async function (m) {
        // var message = await m.data.text();
        var message = await readBlob(m.data);
        var messageObj = JSON.parse(message);

        var netsResponse = messageObj.NetsResponse;
        var {
          Dfs13DisplayText,
          Dfs13PrintText,
          Dfs13LocalMode,
          Dfs13TldReceived,
          Dfs13LastFinancialResult,
          Dfs13TerminalReady,
        } = netsResponse;
        
        // Terminal status information
        if (Dfs13DisplayText !== undefined) {
          setTransactionStatus(Dfs13DisplayText._.replace(/\r/g, "\r\n")); // Replace all..

          if(Dfs13DisplayText.$?.TextID === "1011") // Waiting for card..
          {
            // Do something, when waiting for card..
            setCurrentStatus(status.waiting);
          }
        }

        // Receipt-like info
        if(Dfs13PrintText !== undefined)
        {
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
          window.parent.postMessage({lastFinancialResult:Dfs13LastFinancialResult});
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
          Dfs13TldReceived === undefined // CONSOLING OUT ANY DATA THAT HASN'T BEEN TAKEN INTO ACCOUNT..
        ) {
          console.log("NEW:", netsResponse);
        }
      };

      //clean up function
      return () => {
        webSocket.close();
      };
    }
  }, [webSocket,makeTransaction,postData]);

  useEffect(()=>{
    if(receipt && jsonResult)
    {
      var data = {netsData: jsonResult, receipt:receipt}
      window.parent.postMessage(data,"*");
      setJsonResult(undefined);
      setReceipt(undefined);
      webSocket.close();
    }
  },[receipt,jsonResult,webSocket]);

  var adminCall = (code,optionalData = "") => {
    if (webSocket) {
      setJsonResult(undefined);
      setReceipt(undefined);
      const{terminalId} = postData;
      var json = {
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

  useBeforeunload(()=>{
    adminCall("12594");
  });

  var Transaction = ()=>(
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
              var { terminalId, type, amount, orderID } = postData;
              makeTransaction(terminalId, type, amount, orderID);
              setCurrentStatus(status.waiting);
              // retryAction();
            }}
          >
            Retry
          </ActionButton>
        </div>
      </section>
      <footer>
        <div className="bottom-right">
          <img className="carglass-logo" src={carglassLogo} draggable={false} alt="Carglass repair, carglass replace" />
        </div>
      </footer>
    </div>
  );

  var Administration = ()=>{
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
          <img className="carglass-logo" src={carglassLogo} draggable={false} alt="Carglass repair, carglass replace" />
        </div>
      </footer>
    </div>
  }

  return (
    <div className="App">
      {postData.type === "admin" ? <Administration /> : <Transaction/> }
    </div>
  );
}

export default App;
