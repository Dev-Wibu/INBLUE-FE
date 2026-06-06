/// <reference types="cypress" />

describe("Signup Page", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.intercept("POST", "**/auth/signup", {
      fixture: "api/login-success.json",
    }).as("signupRequest");
    cy.interceptCommonAPIs();
  });

  it("should display signup form", () => {
    cy.visit("/signup");
    cy.get('input[name="fullName"], input[placeholder*="name" i]').should("exist");
    cy.get('input[type="email"], input[name="email"]').should("exist");
    cy.get('input[type="password"], input[name="password"]').should("exist");
    cy.get('button[type="submit"]').should("exist");
  });

  it("should show validation for required fields", () => {
    cy.visit("/signup");
    cy.get('button[type="submit"]').click();
    cy.contains(/required|bắt buộc|vui lòng/i).should("exist");
  });

  it("should show password mismatch error", () => {
    cy.visit("/signup");
    cy.get('input[name="fullName"], input[placeholder*="name" i]').type("Test User");
    cy.get('input[type="email"], input[name="email"]').type("test@example.com");
    cy.get('input[type="password"], input[name="password"]').first().type("password123");
    // Fill confirm password with different value
    cy.get('input[type="password"], input[name="confirmPassword"]')
      .last()
      .type("differentpassword");
    cy.get('button[type="submit"]').click();
    cy.contains(/match|không khớp|passwords do not match|mật khẩu không/i).should("exist");
  });

  it("should require terms agreement", () => {
    cy.visit("/signup");
    cy.get('input[name="fullName"], input[placeholder*="name" i]').type("Test User");
    cy.get('input[type="email"], input[name="email"]').type("test@example.com");
    cy.get('input[type="password"], input[name="password"]').first().type("password123");
    cy.get('input[type="password"], input[name="confirmPassword"]').last().type("password123");
    // Don't check the terms checkbox
    cy.get('button[type="submit"]').click();
    cy.contains(/agree|đồng ý|terms|điều khoản/i).should("exist");
  });

  it("should signup successfully", () => {
    cy.visit("/signup");
    cy.get('input[name="fullName"], input[placeholder*="name" i]').type("Test User");
    cy.get('input[type="email"], input[name="email"]').type("newuser@example.com");
    cy.get('input[type="password"], input[name="password"]').first().type("password123");
    cy.get('input[type="password"], input[name="confirmPassword"]').last().type("password123");
    // Check terms checkbox if it exists
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.get('button[type="submit"]').click();
    cy.wait("@signupRequest");
    cy.url().should("not.include", "/signup");
  });

  it("should have link to login page", () => {
    cy.visit("/signup");
    cy.contains(/login|đăng nhập|sign in|already have/i).should("exist");
  });
});
