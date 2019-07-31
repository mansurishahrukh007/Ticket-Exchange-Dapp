App = {
  web3Provider: null,
  contracts: {},

  init: async function () {
    $.getJSON('../tickets.json', function (data) {
      var ticketsRow = $('#ticketsRow');
      var ticketTemplate = $('#ticketTemplate');

      for (i = 0; i < data.length; i++) {
        ticketTemplate.find('img').attr('src', data[i].picture);
        ticketTemplate.find('.ticket-event').text(data[i].event);
        ticketTemplate.find('.ticket-description').text(data[i].description);
        ticketTemplate.find('.ticket-price').text(data[i].price);
        ticketTemplate.find('.btn-purchase').attr('data-id', data[i].id);

        ticketsRow.append(ticketTemplate.html());
      }
    });

    return await App.initWeb3();
  },

  initWeb3: async function () {
    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.enable();
      } catch (error) {
        // User denied account access...
        console.error("User denied account access")
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function () {
    $.getJSON('TicketTransfer.json', function (data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var TicketTransferArtifact = data;
      App.contracts.TicketTransfer = TruffleContract(TicketTransferArtifact);

      // Set the provider for our contract
      App.contracts.TicketTransfer.setProvider(App.web3Provider);
    });

    return App.bindEvents();
  },

  bindEvents: function () {
    $(document).on('click', '.btn-purchase', App.handlePurchase);
  },

  handlePurchase: function (event) {
    event.preventDefault();

    var ticketID = parseInt($(event.target).data('id'));

    var ticketTransferInstance;

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      // App.contracts.TicketTransfer.deployed().then(function (instance) {
      //   ticketTransferInstance = instance;

      //   // Execute adopt as a transaction by sending account
      //   return ticketTransferInstance.adopt(ticketID, { from: account });
      // }).then(function (result) {
      //   return App.markAdopted();
      // }).catch(function (err) {
      //   console.log(err.message);
      // });
    });
  }

};

$(function () {
  $(window).load(function () {
    App.init();
  });
});
