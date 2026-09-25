// Popup UI Logic

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

import { getBlockedWebsites, saveBlockedWebsites } from "../utils/storage.js";
import { toast } from "../utils/toast.js";

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

  listOfWebsites.innerHTML = "";
  totalNumberOfWebsites.textContent = "";

  getBlockedWebsites((websites) => {
    if (!websites || websites.length === 0) {
      listOfWebsites.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 -960 960 960">
            <path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q150 0 255 105t105 255q0 150-105 255T480-120Zm0-80q116 0 198-82t82-198q0-116-82-198t-198-82q-116 0-198 82t-82 198q0 116 82 198t198 82Zm-40-360v-160h80v160h-80Zm0 240v-160h80v160h-80Zm40-120Z"/>
          </svg>
          <p>Your blocklist is empty. Add a website to stay focused!</p>
        </div>
      `;
    } else {
      websites.forEach((website) => {
        const li = document.createElement("li");
        li.setAttribute("class", "websites-list__item");

        const listWrapper = document.createElement("div");
        listWrapper.setAttribute("class", "item__wrapper");

        const img = document.createElement("img");
        const temp = document.createElement("span");

        temp.textContent = website;
        img.src = `https://www.google.com/s2/favicons?domain=${website}&sz=64`;
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

document.addEventListener("DOMContentLoaded", () => {
  renderListOfWebsites();

  const form = document.getElementById("websiteForm");
  const userInput = document.querySelector("#website");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const rawInput = userInput.value.trim();

    if (!rawInput) return;

    // Normalize URL for robust matching
    let newSite = rawInput.toLowerCase();
    newSite = newSite.replace(/^(https?:\/\/)/, "");
    newSite = newSite.replace(/^www\./, "");
    newSite = newSite.replace(/\/.*$/, ""); // Strip paths if any

    if (!newSite) return;

    getBlockedWebsites((websites) => {
      if (!websites.includes(newSite)) {
        websites.push(newSite);
        saveBlockedWebsites(websites, () => {
          renderListOfWebsites();
          toast(`Website added: ${newSite}`, "success");
          userInput.value = "";
        });
      } else {
        toast(`${newSite} is already blocked`, "danger");
      }
    });
  });
});
