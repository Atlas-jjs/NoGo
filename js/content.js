// Redirect user to block page
// import {  } from "./toast.js";

const redirectUrl = chrome.runtime.getURL("blocked.html");
const list = document.querySelector("#Result");

function createCloseSVG(website) {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("xmlns", svgNS);
  svg.setAttribute("height", "24px");
  svg.setAttribute("width", "24px");
  svg.setAttribute("viewBox", "0 -960 960 960");
  svg.setAttribute("fill", "#5d5f68");

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute(
    "d",
    "M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z",
  );

  svg.appendChild(path);

  svg.addEventListener("click", () => removeWebsiteFromList(website));
  return svg;
}

// Fetches the blocked websites array from the chrome extension storage sync
function getBlockedWebsites(callback) {
  chrome.storage.sync.get(["blockedWebsites"], (result) => {
    const blocked = result.blockedWebsites || [];
    callback(blocked);
  });
}

function removeWebsiteFromList(website) {
  getBlockedWebsites((websites) => {
    if (websites) {
      const updatedList = websites.filter((w) => w !== website);
      saveBlockedWebsites(updatedList, () => renderListOfWebsites());
    }
  });
}

function renderListOfWebsites() {
  const listOfWebsites = document.getElementById("websites-list");
  const totalNumberOfWebsites = document.getElementById("total-websites");
  const re = /^(https?:\/\/)(www\.)?/;

  listOfWebsites.innerHTML = "";
  totalNumberOfWebsites.textContent = "";

  getBlockedWebsites((websites) => {
    if (!websites || websites.length === 0) {
      const li = document.createElement("li");
      li.textContent = "There is no websites to block";
      listOfWebsites.appendChild(li);
    } else {
      websites.forEach((website) => {
        const li = document.createElement("li");
        li.setAttribute("class", "websites-list__item");

        const listWrapper = document.createElement("div");
        listWrapper.setAttribute("class", "item__wrapper");

        const img = document.createElement("img");
        const domain = website.replace(re, "");
        const temp = document.createElement("span");

        // li.textContent = website.replace(re, "");
        temp.textContent = domain;
        img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        img.setAttribute("class", "favicon-icon");

        listWrapper.appendChild(img);
        listWrapper.appendChild(temp);
        li.appendChild(listWrapper);
        li.appendChild(createCloseSVG(website));
        listOfWebsites.appendChild(li);
      });

      totalNumberOfWebsites.textContent = `${websites.length} Sites`;
    }
  });
}

// Check if the current URL is within the array of blocked websites. If yes then it will redirect to the blocked page.
getBlockedWebsites((websites) => {
  if (websites.includes(window.location.origin)) {
    window.location.replace(redirectUrl);
  }
});

function saveBlockedWebsites(array, callback) {
  chrome.storage.sync.set({ blockedWebsites: array }, callback);
}

document.addEventListener("DOMContentLoaded", () => {
  renderListOfWebsites();

  const form = document.getElementById("websiteForm");
  const userInput = document.querySelector("#website");
  const resultDisplay = document.querySelector("#Result");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const newSite = userInput.value.trim();

    if (!newSite) return;

    getBlockedWebsites((websites) => {
      if (!websites.includes(newSite)) {
        websites.push(newSite);
        saveBlockedWebsites(websites, () => {
          renderListOfWebsites();
          resultDisplay.textContent = `Website added: ${newSite}`;
          userInput.value = "";
        });
      } else {
        resultDisplay.textContent = `Website is already Blocked: ${newSite}`;
      }
    });
  });
});
