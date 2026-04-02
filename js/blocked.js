const goBackButton = document.querySelector("#go-back");
if (goBackButton) {
  goBackButton.addEventListener("click", () => {
    window.history.back();
  });
}
