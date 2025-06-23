const socket = io();
const input = document.getElementById("input");
const fileInput = document.getElementById("fileInput");
const form = document.getElementById("form");
const messages = document.getElementById("messages");
const notifySound = document.getElementById("notifySound");
const muteToggle = document.getElementById("muteToggle");
const downloadBtn = document.getElementById("downloadBtn");

const SUPPORT_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Support-Avatar.png";
const CUSTOMER_AVATAR = "https://xpresscomputersolutions.com/wp-content/uploads/Customer-Avatar.png";

function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  return new Blob([ab], { type: mimeString });
}

function buildMessage(who, text, isCustomer, fileURL) {
  const li = document.createElement("li");
  li.className = isCustomer ? "customer" : "support";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  const label = document.createElement("h3");
  label.textContent = who;
  const img = document.createElement("img");
 