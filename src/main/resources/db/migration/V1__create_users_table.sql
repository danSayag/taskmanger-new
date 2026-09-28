CREATE TABLE users (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    username                VARCHAR(255) NOT NULL UNIQUE,
    password                VARCHAR(255) NOT NULL,
    email                   VARCHAR(255) NOT NULL UNIQUE,
    enabled                 BOOLEAN      NOT NULL DEFAULT FALSE,
    verification_code       VARCHAR(255),
    verification_expiration TIMESTAMP
);
