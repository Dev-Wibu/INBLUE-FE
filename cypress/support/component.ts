/// <reference types="cypress" />

// Component testing support file
import { mount } from "cypress/react";

// Augment the Cypress namespace to include type definitions for
// your custom command.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add("mount", mount);

export {};
