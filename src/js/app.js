App = {
  web3Provider: null,
  currentAccount: null,
  contractDeployer: null,
  ticketCounts: 0,
  imageCount: 6,
  contracts: {},
  contractInstance: {},
  allTickets: [],

  init: async function () {
    toastr.options.timeOut = 7000;
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
        console.error(error);
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
        App.contractInstance = instance;

        return App.contractInstance.getTicketCount.call();
      }).then(async function (ticketCounts) {
        App.ticketCounts = Number(ticketCounts);
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
        console.error(error);
        App.errorHandler(error.message);
      }
      App.currentAccount = accounts[0];

      if (App.contractDeployer === null) {
        App.contractDeployer = await App.contractInstance.getContractDeployer.call();
      }

      if (App.currentAccount !== App.contractDeployer) {
        $('#addnewticket').css("display", "none");
      } else {
        $('#addnewticket').css("display", "initial");
      }

      for (let i = 0; i < App.ticketCounts; i++) {
        let ownerAddress = await App.contractInstance.ownerOf(i);
        let approvedBuyer = await App.contractInstance.getApprovedBuyer(i);

        if (App.allTickets.length !== App.ticketCounts) {
          let currentTicket = await App.contractInstance.tickets(i);

          var ticketsRow = $('#ticketsRow');
          var ticketTemplate = $('#ticketTemplate');

          ticketTemplate.find('img').attr('src', `images/tickets/${i % App.imageCount}.jpeg`);
          ticketTemplate.find('.ticket-event').text(currentTicket[0]);
          ticketTemplate.find('.ticket-description').text(currentTicket[1]);
          ticketTemplate.find('.ticket-price').text(`${currentTicket[2]} ether`);
          ticketTemplate.find('.btn-purchase').attr('data-id', i);
          ticketTemplate.find('.btn-approve').attr('data-id', i);
          ticketTemplate.find('.btn-sell').attr('data-id', i);
          ticketsRow.append(ticketTemplate.html());

          App.allTickets.push({
            name: currentTicket[0],
            description: currentTicket[1],
            price: Number(currentTicket[2]),
          });
        }

        if (ownerAddress === App.currentAccount) {
          $('.panel-ticket').eq(i).find('.btn-purchase').text('Purchased').attr('disabled', true);
          $('.panel-ticket').eq(i).find('.btn-sell').text('Sell').attr('disabled', false);
          $('.panel-ticket').eq(i).find('.btn-approve').text('Approve').attr('disabled', true);
        } else {
          $('.panel-ticket').eq(i).find('.btn-sell').text('Sell').attr('disabled', true);
          $('.panel-ticket').eq(i).find('.btn-approve').text('Approve').attr('disabled', false);
          if (ownerAddress !== App.contractDeployer) {
            $('.panel-ticket').eq(i).find('.btn-purchase').text('Purchased').attr('disabled', true);
          } else {
            $('.panel-ticket').eq(i).find('.btn-purchase').text('Purchase').attr('disabled', false);
            $('.panel-ticket').eq(i).find('.btn-sell').text('Sell').attr('disabled', true);
            $('.panel-ticket').eq(i).find('.btn-approve').text('Approve').attr('disabled', true);
          }
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
    $(document).on('click', '.btn-create-ticket', App.handleCreateTicket);
  },

  handlePurchase: function (event) {
    event.preventDefault();
    var ticketID = parseInt($(event.target).data('id'));
    var ticketPrice = App.allTickets[ticketID].price;
    App.contractInstance.transferFrom(App.contractDeployer, App.currentAccount, ticketID, {
      from: App.currentAccount,
      value: web3.toWei(ticketPrice, "ether")
    }).then(async function (response) {
      if (response !== undefined) {
        toastr.success('Ticket purchased successfully.');
      }
      App.updateUI();
    }).catch(function (err) {
      App.errorHandler(err);
    });
  },
  handleApprove: function (event) {
    event.preventDefault();

    var ticketID = parseInt($(event.target).data('id'));
    var ticketPrice = App.allTickets[ticketID].price;
    App.contractInstance.approve(App.currentAccount, ticketID, {
      from: App.currentAccount,
      value: web3.toWei(ticketPrice, "ether")
    }).then(async function (response) {
      if (response !== undefined) {
        toastr.success('You became approved buyer of this ticket.');
      }
      App.updateUI();
    }).catch(function (err) {
      App.errorHandler(err);
    });
  },
  handleSell: function (event) {
    event.preventDefault();
    var ticketID = parseInt($(event.target).data('id'));
    App.contractInstance.getApprovedBuyer(ticketID).then(async function (approvedBuyer) {
      if (approvedBuyer !== '0x0000000000000000000000000000000000000000') {
        return App.contractInstance.resell(approvedBuyer, ticketID);
      } else {
        toastr.info('There is no approved buyer yet.');
      }
    }).then(function (response) {
      if (response !== undefined) {
        toastr.info('Ticket transfered to the approved buyer.');
      }
      App.updateUI();
    }).catch(function (err) {
      App.errorHandler(err);
    });
  },
  handleCreateAccount: function (event) {
    event.preventDefault();
    var firstname = $('#firstname').val();
    var lastname = $('#lastname').val();
    App.contractInstance.accountCreation(firstname.toString(), lastname.toString(),
      { from: App.currentAccount }).then(async function (response) {
        if (response !== undefined) {
          toastr.success('Account Created successfully.');
        }

        App.updateUI();
      }).catch(function (err) {
        App.errorHandler(err);
      });
  },
  handleCreateTicket: function (event) {
    event.preventDefault();
    var name = $('#new-name').val().toString();
    var description = $('#new-description').val().toString();
    var price = Number($('#new-price').val());
    App.contractInstance.createTicket(name, description, price).then(async function (response) {
      if (response !== undefined) {
        let newTicket = await App.contractInstance.tickets(App.ticketCounts);
        let newTicketIndex = App.ticketCounts;
        if (newTicket !== undefined) {
          App.ticketCounts++;
          var ticketsRow = $('#ticketsRow');
          var ticketTemplate = $('#ticketTemplate');

          ticketTemplate.find('img').attr('src', `images/tickets/${newTicketIndex % App.imageCount}.jpeg`);
          ticketTemplate.find('.ticket-event').text(newTicket[0]);
          ticketTemplate.find('.ticket-description').text(newTicket[1]);
          ticketTemplate.find('.ticket-price').text(`${newTicket[2]} ether`);
          ticketTemplate.find('.btn-purchase').attr('data-id', newTicketIndex);
          ticketTemplate.find('.btn-approve').attr('data-id', newTicketIndex);
          ticketTemplate.find('.btn-sell').attr('data-id', newTicketIndex);
          ticketsRow.append(ticketTemplate.html());

          App.allTickets.push({
            name: newTicket[0],
            description: newTicket[1],
            price: Number(newTicket[2]),
          });
        }
        toastr.success('Ticket Created successfully.');
      }
      App.updateUI();
    }).catch(function (err) {
      App.errorHandler(err);
    });
  },
  errorHandler: function (err) {
    console.error(err);
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
