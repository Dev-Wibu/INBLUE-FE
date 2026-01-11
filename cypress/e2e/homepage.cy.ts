/// <reference types="cypress" />

/**
 * Example E2E Test: Homepage
 * This is a sample test to demonstrate Cypress E2E testing
 */

describe("Homepage", () => {
  beforeEach(() => {
    // Visit the homepage before each test
    cy.visit("/");
  });

  it("should load the homepage", () => {
    // Check that the page loads
    cy.url().should("include", "/");
  });

  it("should display navigation", () => {
    // Check for navigation elements
    cy.get("nav").should("exist");
  });

  it("should have a login link", () => {
    // Check for login functionality
    cy.contains(/login|đăng nhập/i).should("exist");
  });
});
