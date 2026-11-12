/**
 * DOM Safety Barrier for COBRA GAMES JR
 *
 * Defense-in-depth safeguard against external DOM mutations (browser translation,
 * AdSense auto-injection, password managers, accessibility extensions) that detach
 * or reparent React-managed child nodes and would otherwise trigger:
 * "NotFoundError: Failed to execute 'insertBefore' on 'Node'"
 */

export function installDOMSafetyPolyfill(): void {
  if (typeof window === 'undefined' || typeof Node === 'undefined') {
    return;
  }

  if ((window as any).__COBRA_DOM_SAFETY_INSTALLED__) {
    return;
  }
  (window as any).__COBRA_DOM_SAFETY_INSTALLED__ = true;

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[SafeDOM] insertBefore recovered: referenceNode is not a child of target parent.',
          { parent: this, newNode, referenceNode }
        );
      }
      return this.appendChild(newNode);
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child && child.parentNode !== this) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[SafeDOM] removeChild recovered: child is not a child of target parent.',
          { parent: this, child }
        );
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalReplaceChild = Node.prototype.replaceChild;
  Node.prototype.replaceChild = function <T extends Node>(newChild: Node, oldChild: T): T {
    if (oldChild && oldChild.parentNode !== this) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[SafeDOM] replaceChild recovered: oldChild is not a child of target parent.',
          { parent: this, newChild, oldChild }
        );
      }
      this.appendChild(newChild);
      return oldChild;
    }
    return originalReplaceChild.call(this, newChild, oldChild) as T;
  };
}

installDOMSafetyPolyfill();
