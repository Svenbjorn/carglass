import logo from './logo.svg';
import './App.scss';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ActionButton from './ActionButton/ActionButton';
import carglassLogo from "./assets/carglass.svg";
import TransactionStatus from './TransactionStatus';
// import axios from 'axios';
import axiosObservable from  'axios-observable';
import NetsLogo from './NetsLogo';
import axios from 'axios';

const status = Object.freeze({
  waiting: Symbol("waiting"),
  error:   Symbol("error"),
  done:    Symbol("done"),
})

function App() {
  
  // const netsApiUrl = "https://connectcloud-test.aws.nets.eu/v1";
  const netsApiUrl = "ws://connectcloud-test.aws.nets.eu/ws/json";
  const[message,setMessage] = useState("");
  const [token, setToken] = useState(undefined);
  const [currentStatus, setCurrentStatus] = useState(status.error);
  
  const terminalId = 74212001;
  const username = "test_nordia";
  const password = "5up3r-cloud!";

  const netsLogin = useCallback(()=>{
      // axios.post(netsApiUrl + "/login", {
      //   username,
      //   password,

      //   // Nav2Day terminal
      //   // username: "test1_nav2day",
      //   // password: "$hmLSd3Q1aQ?WL5h",
      // }).then(response=>{
      //   console.log(response);
      //   setToken(response.data.token);
      // }).catch(error=>{
      //   console.log(error)
      // })
      axiosObservable
        .post(netsApiUrl + "/login", {
          username,
          password,

          // Nav2Day terminal
          // username: "test1_nav2day",
          // password: "$hmLSd3Q1aQ?WL5h",
        })
        .subscribe({
          complete: (response) => {
            console.log(response);
          },
          error: (error) => {
            console.log(error);
          },
          next: (e) => {
            console.log(e);
          },
        });
  });
  
  // const netsCancel = useCallback(() => {
  //     axios.post(
  //       netsApiUrl + `/terminal/${terminalId}/administration`,
  //       {
  //         username,
  //         password,

  //         // Nav2Day terminal
  //         // username: "test1_nav2day",
  //         // password: "$hmLSd3Q1aQ?WL5h",
  //       },
  //       {
  //         headers: {
  //           Authorization: "Bearer " + token,
  //           "content-type": "application/json",
  //         },
  //       }
  //     )
  //     .then((response) => {
  //       resolve(response.data);
  //     })
  //     .catch((error) => {
  //       reject(error);
  //     });
  // })

  const netsProtocols = useCallback(async ()=>{
    const login = await netsLogin();

    // const{token} = login;
    if(token)
    {
  
      axiosObservable
        .post(netsApiUrl + `/terminal/${terminalId}/transaction/`,{
          "transactionType": "purchase",
          "amount": 2515,
          "currency": "USD"
          // "allowPinBypass": false,
          // "operatorId": 4321,
          // "orderId": "10A90015224431"
        },
        {
          headers:{
            Authorization:"Bearer " + token,
            'content-type': 'application/json',
          }})
        .subscribe({
          complete: (response) => {
            console.log(response, "Complete.");
          },
          error: (error) => {
            console.log(error);
          },
          next: (v) => {
            console.log(v);
          },
        })
      
      // axios
      //   .post(netsApiUrl + "/terminal/74212001/print/",{
      //     // Info needed..........
      //   },
      //   {
      //     headers:{
      //       Authorization:"Bearer " + token,
      //       'content-type': 'application/json',
      //     }})
      //   .then((response) => {
      //       console.log(response, "Complete.");
      //     }).catch((error) => {
      //       console.log(error);
      //     })
      
      // axiosObservable
      //   .delete(netsApiUrl + "/terminal/74212001/transaction/",{
      //     "transactionType": "purchase",
      //     "amount": 2515,
      //     // "allowPinBypass": false,
      //     // "operatorId": 4321,
      //     // "orderId": "10A90015224431"
      //   },
      //   {
      //     headers:{
      //       Authorization:"Bearer " + token,
      //       'content-type': 'application/json',
      //     }})
      //   .subscribe({
      //     complete: (response) => {
      //       console.log(response, "Complete.");
      //     },
      //     error: (error) => {
      //       console.log(error);
      //     },
      //     next: (v) => {
      //       console.log(v);
      //     },
      //   })






  
      // window.addEventListener("message",(e)=>{
      //   console.log(e);
      // });
  
      // setTimeout(()=>{
      //   console.log("aaa");
      //   let data = {
      //       success: true
      //   }
      //   window.top.postMessage(data, "*");
      // },3000)
    }

  },[]);
  
  useEffect(()=>{
    // netsProtocols();
    const ws = new WebSocket(
      "wss://" +
        // username +
        // ":" +
        // password +
        "connectcloud-test.aws.nets.eu/ws/json"
    );
        ws.onerror = (error)=>{console.log(error)};
        ws.onopen = (event) => {
          console.log(event)
            ws.send(JSON.stringify(1234));
        };
        ws.onmessage = function (event) {
            const json = JSON.parse(event.data);
            try {
                if ((json.event == 'data')) {
                    // setBids(json.data.bids.slice(0, 5));
                }
            } catch (err) {
                console.log(err);
            }
        };
        //clean up function
        return () => ws.close();
    // const ws = new WebSocket(netsApiUrl);
    ws.onopen = (event) => {
      console.log("asdad",event);
      ws.send(JSON.stringify({username,password}));
    };
    ws.onmessage = function (event) {
      console.log(event);
    }
  },[]);

  const cancelTransaction = useCallback(()=>{
    window.top.postMessage({success:true,message:"NETS cancel"},"*");
  },[])

  return (
    <div className="App">
      <header>
        <h1 className="header-text">
          Payment
          <div className="border-line" />
        </h1>
      </header>
      <section>
        {/* <NetsLogo /> */}
        <TransactionStatus
          // message={message}
          message={"Waiting for pin..."}
          processing={true}
        />
        <div className="buttons-container">
          <ActionButton className="cancel-button" action={cancelTransaction}>
            Cancel
          </ActionButton>
          <ActionButton
            className="retry-button"
            disabled={true}
            action={() => {
              console.log("sadasd");
            }}
          >
            Retry
          </ActionButton>
        </div>
      </section>
      <footer>
        <div className="bottom-right">
          <img className="carglass-logo" src={carglassLogo} draggable={false} />
        </div>
      </footer>
    </div>
  );
}

export default App;
