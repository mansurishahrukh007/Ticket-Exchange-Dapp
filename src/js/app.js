App = {
  web3Provider: null,
  currentAccount: null,
  ticketCounts: 0,
  contracts: {},

  init: async function () {
    $.getJSON('../tickets.json', function (data) {
    });
    toastr.options.timeOut = 7000; // 1.5s
    // toastr.info('Page Loaded!');
    // $('#linkButton').click(function () {
    //   toastr.success('Click Button');
    // });
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

        console.log('[error]', error);

        // User denied account access...
        console.error("User denied account access");
        toastr.error("User denied account access");
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

    web3.currentProvider.publicConfigStore.on('update', function (update) {
      App.updateUI();
    });
    return App.initContract();
  },

  initContract: function () {
    $.getJSON('TicketTransfer.json', function (data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var TicketTransferArtifact = data;
      App.contracts.TicketTransfer = TruffleContract(TicketTransferArtifact);

      // Set the provider for our contract
      App.contracts.TicketTransfer.setProvider(App.web3Provider);

      App.contracts.TicketTransfer.deployed().then(function (instance) {
        ticketTransferInstance = instance;

        return ticketTransferInstance.getTicketCount.call();
      }).then(async function (ticketCounts) {
        App.ticketCounts = ticketCounts;

        var ticketsRow = $('#ticketsRow');
        var ticketTemplate = $('#ticketTemplate');
        $.getJSON('../tickets.json', function (data) {
          for (i = 0; i < ticketCounts; i++) {
            ticketTemplate.find('img').attr('src', data[i].picture);
            ticketTemplate.find('.ticket-event').text(data[i].event);
            ticketTemplate.find('.ticket-description').text(data[i].description);
            ticketTemplate.find('.ticket-price').text(data[i].price);
            ticketTemplate.find('.btn-purchase').attr('data-id', data[i].id);
            ticketTemplate.find('.btn-approve').attr('data-id', data[i].id);
            ticketTemplate.find('.btn-sell').attr('data-id', data[i].id);
            ticketsRow.append(ticketTemplate.html());
          }
        });
        App.updateUI();
      }).catch(function (err) {
        App.errorHandler(err);
      });
    });

    return App.bindEvents();
  },

  updateUI: function () {
    web3.eth.getAccounts(async function (error, accounts) {
      if (error) {
        console.log(error);
      }
      App.currentAccount = accounts[0];
      for (let i = 0; i < App.ticketCounts; i++) {
        let ownerAddress = await ticketTransferInstance.ownerOf(i);
        let approvedBuyer = await ticketTransferInstance.getApprovedBuyer(i);
        console.log(i, approvedBuyer);

        if (ownerAddress === App.currentAccount) {
          $('.panel-ticket').eq(i).find('.btn-purchase').text('Purchased').attr('disabled', true);
          $('.panel-ticket').eq(i).find('.btn-sell').text('Sell').attr('disabled', false);
          $('.panel-ticket').eq(i).find('.btn-approve').text('Approve').attr('disabled', true);
        } else {
          $('.panel-ticket').eq(i).find('.btn-purchase').text('Purchase').attr('disabled', false);
          $('.panel-ticket').eq(i).find('.btn-sell').text('Sell').attr('disabled', true);
          $('.panel-ticket').eq(i).find('.btn-approve').text('Approve').attr('disabled', false);
        }

        if (approvedBuyer !== '0x0000000000000000000000000000000000000000') {
          if (approvedBuyer === App.currentAccount) {
            $('.panel-ticket').eq(i).find('.btn-approve').text('Approved by me').attr('disabled', true);
          } else {
            $('.panel-ticket').eq(i).find('.btn-approve').text('Approved').attr('disabled', true);
          }
        }
      }
    });
  },
  bindEvents: function () {
    $(document).on('click', '.btn-purchase', App.handlePurchase);
    $(document).on('click', '.btn-approve', App.handleApprove);
    $(document).on('click', '.btn-sell', App.handleSell);
    $(document).on('click', '.btn-create-account', App.handleCreateAccount);
  },

  handlePurchase: function (event) {
    event.preventDefault();

    var ticketID = parseInt($(event.target).data('id'));
    console.log('[ticketID]', ticketID);

    var ticketTransferInstance;

    $.getJSON('../tickets.json', function (data) {
      var ticketPrice = data[ticketID].priceEther;

      App.contracts.TicketTransfer.deployed().then(function (instance) {
        ticketTransferInstance = instance;
        return ticketTransferInstance.getContractDeployer.call();
      }).then(function (ticketOwner) {
        console.log('[ticket owner]', ticketOwner);
        return ticketTransferInstance.transferFrom(ticketOwner, App.currentAccount, ticketID, {
          from: App.currentAccount,
          value: web3.toWei(ticketPrice, "ether")
        });
      }).then(async function (response) {
        toastr.success('Ticket purchased successfully.');
        App.updateUI();
      }).catch(function (err) {
        App.errorHandler(err);
      });
    });

  },
  handleApprove: function (event) {
    event.preventDefault();

    var ticketID = parseInt($(event.target).data('id'));
    console.log('[ticketID]', ticketID);

    var ticketTransferInstance;

    $.getJSON('../tickets.json', function (data) {
      var ticketPrice = data[ticketID].priceEther;
      console.log('ticket price', ticketPrice);
      console.log('[currentaccount]', App.currentAccount);

      App.contracts.TicketTransfer.deployed().then(function (instance) {
        ticketTransferInstance = instance;
        return ticketTransferInstance.approve(App.currentAccount, ticketID, {
          from: App.currentAccount,
          value: web3.toWei(ticketPrice, "ether")
        });
      }).then(async function (response) {
        if (response !== undefined) {
          toastr.success('You became approved buyer of this ticket.');
        }

        App.updateUI();
      }).catch(function (err) {
        App.errorHandler(err);
      });
    });

  },
  handleSell: function (event) {
    event.preventDefault();

    var ticketID = parseInt($(event.target).data('id'));
    console.log('[ticketID]', ticketID);

    var ticketTransferInstance;

    $.getJSON('../tickets.json', function (data) {
      var ticketPrice = data[ticketID].priceEther;
      console.log('ticket price', ticketPrice);
      console.log('[currentaccount]', App.currentAccount);

      App.contracts.TicketTransfer.deployed().then(function (instance) {
        ticketTransferInstance = instance;
        return ticketTransferInstance.getApprovedBuyer(ticketID);
      }).then(async function (approvedBuyer) {
        if (approvedBuyer !== '0x0000000000000000000000000000000000000000') {
          console.log('approved Buyer', approvedBuyer);
          return ticketTransferInstance.resell(approvedBuyer, ticketID);
        } else {
          toastr.info('There is no approved buyer yet.');
        }
      }).then(function (response) {
        console.log('response', response);
        App.updateUI();
      }).catch(function (err) {
        App.errorHandler(err);
      });
    });

  },
  handleCreateAccount: function (event) {
    event.preventDefault();
    var firstname = $('#firstname').val();
    var lastname = $('#lastname').val();
    console.log(firstname, lastname);

    App.contracts.TicketTransfer.deployed().then(function (instance) {
      ticketTransferInstance = instance;
      return ticketTransferInstance.accountCreation(firstname.toString(), lastname.toString(), { from: App.currentAccount });
    }).then(async function (response) {
      console.log('account create response', response);
      if (response !== undefined) {
        toastr.success('Account Created successfully.');
      }

      App.updateUI();
    }).catch(function (err) {
      App.errorHandler(err);
    });
  },
  errorHandler: function (err) {
    console.log(err.message);
    if (err.message.includes('Error: VM Exception while processing transaction: revert ')) {
      toastr.error(err.message.split('Error: VM Exception while processing transaction: revert ')[1]);
    }
    if (err.message.includes('Error: MetaMask Tx Signature: ')) {
      toastr.error(err.message.split('Error: MetaMask Tx Signature: ')[1]);
    }
  }
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});
