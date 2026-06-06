/// <reference types="cypress" />

describe("Route Guards — Protected Routes", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.interceptCommonAPIs();
    // Mock all API endpoints to avoid network errors
    cy.intercept("GET", "**/api/**", {
      statusCode: 200,
      body: { traceId: "mock", data: [] },
    });
    cy.intercept("POST", "**/api/**", {
      statusCode: 200,
      body: { traceId: "mock", data: {} },
    });
  });

  // --- Unauthenticated redirects to /login ---
  const protectedRoutes = ["/user", "/mentor", "/admin", "/staff"];

  protectedRoutes.forEach((route) => {
    it(`should redirect unauthenticated user from ${route} to /login`, () => {
      cy.visit(route, { failOnStatusCode: false });
      cy.url().should("include", "/login");
    });
  });

  // --- Role-based access control ---
  it("should redirect USER from /admin to /error/403", () => {
    cy.login("USER");
    cy.visit("/admin", { failOnStatusCode: false });
    cy.url().should("include", "/error/403");
  });

  it("should redirect USER from /mentor to /error/403", () => {
    cy.login("USER");
    cy.visit("/mentor", { failOnStatusCode: false });
    cy.url().should("include", "/error/403");
  });

  it("should redirect USER from /staff to /error/403", () => {
    cy.login("USER");
    cy.visit("/staff", { failOnStatusCode: false });
    cy.url().should("include", "/error/403");
  });

  it("should redirect MENTOR from /admin to /error/403", () => {
    cy.login("MENTOR");
    cy.visit("/admin", { failOnStatusCode: false });
    cy.url().should("include", "/error/403");
  });

  it("should redirect MENTOR from /user to /error/403", () => {
    cy.login("MENTOR");
    cy.visit("/user", { failOnStatusCode: false });
    cy.url().should("include", "/error/403");
  });

  // --- Correct role access ---
  it("should allow USER to access /user", () => {
    cy.login("USER");
    cy.visit("/user");
    cy.url().should("include", "/user");
  });

  it("should allow ADMIN to access /admin", () => {
    cy.login("ADMIN");
    cy.visit("/admin");
    cy.url().should("include", "/admin");
  });

  it("should allow MENTOR to access /mentor", () => {
    cy.login("MENTOR");
    cy.visit("/mentor");
    cy.url().should("include", "/mentor");
  });

  it("should allow STAFF to access /staff", () => {
    cy.login("STAFF");
    cy.visit("/staff");
    cy.url().should("include", "/staff");
  });
});
