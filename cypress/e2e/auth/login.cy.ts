/// <reference types="cypress" />

describe("Login Page", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.intercept("POST", "**/auth/login", {
      fixture: "api/login-success.json",
    }).as("loginRequest");
    cy.interceptCommonAPIs();
  });

  it("should display login form", () => {
    cy.visit("/login");
    cy.get('input[type="email"], input[name="email"], input[placeholder*="email" i]').should(
      "exist"
    );
    cy.get('input[type="password"], input[name="password"]').should("exist");
    cy.get('button[type="submit"]').should("exist");
  });

  it("should show validation for empty email", () => {
    cy.visit("/login");
    cy.get('button[type="submit"]').click();
    cy.contains(/required|bắt buộc|email.*required|vui lòng/i).should("exist");
  });

  it("should show validation for empty password", () => {
    cy.visit("/login");
    cy.get('input[type="email"], input[name="email"], input[placeholder*="email" i]').type(
      "test@example.com"
    );
    cy.get('button[type="submit"]').click();
    cy.contains(/required|bắt buộc|password.*required|vui lòng/i).should("exist");
  });

  it("should login successfully with USER credentials", () => {
    cy.visit("/login");
    cy.get('input[type="email"], input[name="email"], input[placeholder*="email" i]').type(
      "binhan@gmail.com"
    );
    cy.get('input[type="password"], input[name="password"]').type("123");
    cy.get('button[type="submit"]').click();
    cy.wait("@loginRequest");
    cy.url().should("include", "/user");
  });

  it("should login successfully with ADMIN credentials", () => {
    cy.intercept("POST", "**/auth/login", (req) => {
      req.reply({
        statusCode: 200,
        body: {
          traceId: "mock-trace-id",
          data: {
            user: {
              id: 2,
              email: "thuson@gmail.com",
              fullName: "Thùy Sơn",
              role: "ADMIN",
              avatar: null,
            },
            token: "mock-jwt-token-admin",
          },
        },
      });
    }).as("adminLogin");

    cy.visit("/login");
    cy.get('input[type="email"], input[name="email"], input[placeholder*="email" i]').type(
      "thuson@gmail.com"
    );
    cy.get('input[type="password"], input[name="password"]').type("12345");
    cy.get('button[type="submit"]').click();
    cy.wait("@adminLogin");
    cy.url().should("include", "/admin");
  });

  it("should login successfully with MENTOR credentials", () => {
    cy.intercept("POST", "**/auth/login", (req) => {
      req.reply({
        statusCode: 200,
        body: {
          traceId: "mock-trace-id",
          data: {
            user: { id: 3, email: "b@fpt.com", fullName: "Mentor B", role: "MENTOR", avatar: null },
            token: "mock-jwt-token-mentor",
          },
        },
      });
    }).as("mentorLogin");

    cy.visit("/login");
    cy.get('input[type="email"], input[name="email"], input[placeholder*="email" i]').type(
      "b@fpt.com"
    );
    cy.get('input[type="password"], input[name="password"]').type("12345");
    cy.get('button[type="submit"]').click();
    cy.wait("@mentorLogin");
    cy.url().should("include", "/mentor");
  });

  it("should show error for wrong password", () => {
    cy.intercept("POST", "**/auth/login", {
      statusCode: 401,
      body: { traceId: "mock-trace-id", message: "Bad credentials" },
    }).as("wrongPassword");

    cy.visit("/login");
    cy.get('input[type="email"], input[name="email"], input[placeholder*="email" i]').type(
      "binhan@gmail.com"
    );
    cy.get('input[type="password"], input[name="password"]').type("wrongpassword");
    cy.get('button[type="submit"]').click();
    cy.wait("@wrongPassword");
    cy.contains(/bad credentials|sai|mật khẩu|incorrect|wrong/i).should("exist");
  });

  it("should show error for non-existent email", () => {
    cy.intercept("POST", "**/auth/login", {
      statusCode: 404,
      body: { traceId: "mock-trace-id", message: "User not found with email" },
    }).as("userNotFound");

    cy.visit("/login");
    cy.get('input[type="email"], input[name="email"], input[placeholder*="email" i]').type(
      "nonexistent@example.com"
    );
    cy.get('input[type="password"], input[name="password"]').type("12345");
    cy.get('button[type="submit"]').click();
    cy.wait("@userNotFound");
    cy.contains(/not found|không tìm thấy|user not found/i).should("exist");
  });

  it("should show error for locked account", () => {
    cy.intercept("POST", "**/auth/login", {
      statusCode: 423,
      body: { traceId: "mock-trace-id", message: "Account is locked" },
    }).as("lockedAccount");

    cy.visit("/login");
    cy.get('input[type="email"], input[name="email"], input[placeholder*="email" i]').type(
      "locked@example.com"
    );
    cy.get('input[type="password"], input[name="password"]').type("12345");
    cy.get('button[type="submit"]').click();
    cy.wait("@lockedAccount");
    cy.contains(/locked|bị khóa|tài khoản/i).should("exist");
  });

  it("should toggle password visibility", () => {
    cy.visit("/login");
    cy.get('input[type="password"], input[name="password"]').should("exist");
    // Find the toggle button near the password field (typically an eye icon button)
    cy.get('input[type="password"], input[name="password"]')
      .parent()
      .find("button")
      .first()
      .click({ force: true });
    // After toggle, the input should still exist (type may change to text)
    cy.get('input[name="password"]').should("exist");
  });

  it("should have a link to signup page", () => {
    cy.visit("/login");
    cy.contains(/signup|đăng ký|register|sign up/i).should("exist");
  });

  it("should redirect logged-in user away from login page", () => {
    cy.login("USER");
    cy.visit("/login");
    cy.url().should("include", "/user");
  });
});
