const params = new URLSearchParams(window.location.search);
const reason = params.get("reason") || "manual";
const site = params.get("site") || "";

const reasonMap = {
  nsfw: {
    message:
      "This site contains adult or explicit content and has been blocked by NoGo's NSFW filter.",
  },
  gambling: {
    message:
      "This is a gambling or betting site and has been blocked by NoGo's gambling filter.",
  },
  illegal: {
    message:
      "This site has been flagged as harmful or illegal and has been blocked by NoGo.",
  },
  manual: {
    message: "You manually added this website to your blocklist.",
  },
};

const info = reasonMap[reason] || reason.manual;

const reasonElement = document.getElementById("block-reason");
const siteElement = document.getElementById("site-name");
const quoteElement = document.getElementById("quote");

if (reasonElement) reasonElement.textContent = info.message;
if (siteElement && site) siteElement.textContent = site;

const quotes = [
  "“Starve your distractions, feed your focus.”",
  "“Focus on being productive instead of busy.”",
  "“You don't get results by focusing on results. You get results by focusing on the actions that produce results.”",
  "“The successful warrior is the average man, with laser-like focus.”",
  "“Lack of direction, not lack of time, is the problem.”",
];

if (quoteElement) {
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  quoteElement.textContent = randomQuote;
}

const goBackButton = document.querySelector("#go-back");
if (goBackButton) {
  goBackButton.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  });
}
