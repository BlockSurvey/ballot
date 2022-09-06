import { getStacksProvider } from './utils.esm.js';
import { authenticate } from './auth.esm.js';
import { defineCustomElements } from '@stacks/connect-ui/loader';

var showConnect = function showConnect(authOptions) {
  if (getStacksProvider()) {
    void authenticate(authOptions);
    return;
  }

  if (typeof window !== void 0) {
    void defineCustomElements(window);
    var element = document.createElement("connect-modal");
    element.authOptions = authOptions;
    document.body.appendChild(element);

    var handleEsc = function handleEsc(ev) {
      if (ev.key === "Escape") {
        document.removeEventListener("keydown", handleEsc);
        element.remove();
      }
    };

    document.addEventListener("keydown", handleEsc);
  }
};
var showBlockstackConnect = function showBlockstackConnect(authOptions) {
  return showConnect(authOptions);
};

export { showBlockstackConnect, showConnect };
//# sourceMappingURL=ui.esm.js.map
