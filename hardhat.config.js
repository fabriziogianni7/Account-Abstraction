"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@nomicfoundation/hardhat-toolbox");
const config = {
    solidity: "0.8.17",
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};
exports.default = config;
