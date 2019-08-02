const TicketTransfer = artifacts.require("TicketTransferSimplified");

module.exports = function (deployer) {
  deployer.deploy(TicketTransfer);
};