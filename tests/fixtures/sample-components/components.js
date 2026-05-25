class HsAccordion extends HTMLElement {
  connectedCallback() { this.innerHTML = `<details><summary>${this.getAttribute("title")}</summary>${this.innerHTML}</details>`; }
}
customElements.define("hs-accordion", HsAccordion);
class HsCopyButton extends HTMLElement {
  connectedCallback() { this.innerHTML = `<button>Copy</button>`; }
}
customElements.define("hs-copy-button", HsCopyButton);
