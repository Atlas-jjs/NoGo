export function toast(message, type = "success") {
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toastEl = document.createElement("div");
  toastEl.className = `toast ${type}`;
  toastEl.textContent = message;

  document.body.appendChild(toastEl);

  // Trigger reflow for animation
  void toastEl.offsetWidth;
  toastEl.classList.add("show");

  setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => {
      if (toastEl.parentNode) toastEl.remove();
    }, 300);
  }, 3000);
}
