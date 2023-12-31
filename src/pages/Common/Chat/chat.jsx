import React, { useEffect, useRef, useState } from "react";
import "./chat.scss"; // Import your custom CSS for the chat component
import * as signalR from "@microsoft/signalr";
import { Button, Form, Modal } from "react-bootstrap"; // Import necessary components
import { getAllMessageByAccountID } from "../../../services/chatServices";
import { decodeToken, isTokenExpired } from "../../../services/jwtHelper";
import { refreshAccessToken, logout } from "../../../services/userService"
import jwtDecode from "jwt-decode";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import hosting from "../../../Utils/config";
import { formatDate } from "../../../Utils/util";
const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [connection, setConnection] = useState(null);
  const [senderId, setSenderId] = useState("");
  const chatContentRef = useRef(null);
  const [user, setUser] = useState(null);
  const [isManager, setIsManager] = useState(false);
  const [disableButton, setDisableButton] = useState(false);

  const navigator = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token != null || token != undefined) {
      const decodedToken = jwtDecode(token);
      setUser(decodedToken);
      let user = decodeToken();
      if (user.userRole == "admin" || user.userRole == "staff") {
        setIsManager(true);
      }
    }
  }, []);

  const getAllMessageByAccount = async () => {
    const userToken = decodeToken(localStorage.getItem("token"));
    setSenderId(userToken?.accountID);

    if (userToken !== null) {
      try {
        let res = await getAllMessageByAccountID(userToken?.accountID);

        if (res.data) {
          setMessages(res.data);
        }
        if (res.status == 400) {
          setMessages([]);

        }

      } catch (error) {
      }

    }
  };
  useEffect(() => {
    getAllMessageByAccount();

  }, []);
  useEffect(() => {
    const startConnection = async () => {
      const userToken = decodeToken();
      setSenderId(userToken?.accountID);
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${hosting}/chat`)
        .build();

      newConnection.onclose((error) => {
        console.log("Connection closed:", error);
      });

      newConnection.onreconnecting(() => {
        console.log("Reconnecting...");
      });

      newConnection.onreconnected(() => {
        console.log("Reconnected.");
      });

      try {
        await newConnection.start();
        setConnection(newConnection);

        newConnection.on("ReceiveMessage", (newMessageList) => {
          // Update the messages state with the new list of messages
          console.log(newMessageList);
          setMessages(newMessageList);
          chatContentRef.current.scrollTop =
            chatContentRef.current.scrollHeight;
        });
      } catch (error) {
        console.error("Error starting connection:", error);
      }
    };

    startConnection();
  }, []);



  const [showModal, setShowModal] = useState(false); // State to control modal visibility

  const handleOpenModal = () => {

    setShowModal(true);

  };

  const handleCloseModal = () => {
    setShowModal(false);
  };
  const sendMessage = async () => {
    if (user != null) {
      if (message != "") {
        setDisableButton(true);
        console.log("Sending message...");
        const userToken = decodeToken();
        if (connection && message.trim() !== "") {
          try {
            console.log("About to invoke SendMessage...");

            console.log({
              accountID: userToken?.accountID,
              message: message,
            });

            await connection.invoke("SendMessage", {
              accountID: userToken?.accountID,
              message: message,
            });

            console.log("Message sent successfully.");

            setMessage("");
            chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
            setDisableButton(false);
          } catch (error) {
            console.error("Error sending message:", error);
          }
        }
      }



    } else {
      toast.error("Please log in to chat");
    }

  };

  return (
    <>
      <div className="chat-button">
        {!showModal &&
          <Button style={{ backgroundColor: 'black', color: 'white', border: 'none', height: '50px', width: '50px', borderRadius: '50%', display: isManager == true ? "none" : "block" }} onClick={handleOpenModal}>
            <i className="fa-solid fa-comment-dots"></i>
          </Button>
        }

        <div className="page-content page-container" id="page-content" style={{ display: showModal ? "block" : "none" }}>
          <div className="row  d-flex justify-content-center">
            <div className="col-md-12">
              <div className="" style={{ borderRadius: '15px' }}>

                <div className="card">
                  <div className=" d-flex p-3" style={{ justifyContent: 'space-between', borderBottom:'1px solid #ccc' }}>
             <h6>Chat Now</h6>
                    <Button style={{ width: '40px', backgroundColor: 'red', border: 'none' }} onClick={() => handleCloseModal()}><i className="fa-solid fa-xmark"></i></Button>
                  </div>
                  <div
                    className="ps-container ps-theme-default ps-active-y "
                    id="chat-content"
                    ref={chatContentRef}
                  >
                    {messages && messages.map((item, index) => {
                      return (
                        <div
                          key={index}
                          className={`media media-chat ${item.applicationUserId == senderId ? "media-chat-reverse" : ""
                            }`}
                        >
                          <img
                            className="avatar"
                            src="https://img.icons8.com/color/36/000000/administrator-male.png"
                            alt="..."
                          />
                          <div className="media-body" width="100%">
                            <p>{item.content}
                              <span style={{ display: 'block', fontSize: '10px' }}>{formatDate(item.sendTime)}</span>

                            </p>
                            <br />



                          </div>
                        </div>

                      )
                    }
                    )}

                    <div
                      className="ps-scrollbar-x-rail"
                      style={{ left: 0, bottom: 0 }}
                    >
                      <div
                        className="ps-scrollbar-x"
                        style={{ left: 0, width: 0 }}
                      ></div>
                    </div>
                    <div
                      className="ps-scrollbar-y-rail"
                      style={{ top: 0, height: 0, right: "2px" }}
                    >
                      <div
                        className="ps-scrollbar-y"
                        style={{ top: 0, height: "2px" }}
                      ></div>
                    </div>
                  </div>

                  <div className="publisher bt-1 border-light ">


                    <Form onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage();
                    }} style={{ display: 'flex', width: '100%', alignItems: 'center', color: 'white' }}>
                      <input
                        className="publisher-input"
                        type="text"
                        placeholder="Chat here"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />

                      <Button
                        type="submit"
                        className="publisher-btn text-info"
                        onClick={sendMessage}
                        disabled={disableButton}
                      >
                        <i className="fa fa-paper-plane"></i>
                      </Button>
                    </Form>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
};

export default Chat;
