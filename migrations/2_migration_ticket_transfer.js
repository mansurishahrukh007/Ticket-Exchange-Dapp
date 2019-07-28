const TicketTransfer = artifacts.require("TicketTransfer");

module.exports = function(deployer) {
  deployer.deploy(TicketTransfer);
};
