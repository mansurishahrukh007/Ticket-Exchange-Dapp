pragma solidity >=0.4.21 <0.6.0;

import "./TicketCreation_simplified.sol";
import "./erc721.sol";

contract TicketTransferSimplified is TicketCreationSimplified, ERC721 {
    address contractDeployer;

    constructor() public {
        contractDeployer = msg.sender;

        tickets.push(Ticket({eventName:"Event1", description:"Description1", price:1}));
        tickets.push(Ticket({eventName:"Event2", description:"Description2", price:2}));
        tickets.push(Ticket({eventName:"Event3", description:"Description3", price:3}));
        tickets.push(Ticket({eventName:"Event4", description:"Description4", price:1}));
        tickets.push(Ticket({eventName:"Event5", description:"Description5", price:2}));
        tickets.push(Ticket({eventName:"Event6", description:"Description6", price:3}));
        tickets.push(Ticket({eventName:"Event7", description:"Description7", price:4}));

        for (uint i = 0; i < 7; i++) {
            ticketsToOwner[i] = msg.sender;
            ownerToQuantity[msg.sender]++;
        }
    }

    event Transfer(address indexed _from, address indexed _to, uint256 indexed _ticketId);
    event Approval(address indexed _owner, address indexed _approved, uint256 indexed _ticketId);

    mapping (uint256 => uint256) ticketIdToPending;
    mapping (uint256 => address) approvedBuyers;

    /* This modifier does not allow the msg.sender to be the seller */
    modifier notSeller(uint256 _ticketId){
        require(msg.sender != ticketsToOwner[_ticketId], "You are not the buyer.");
        _;
    }

    /* This modifier requires the ticket holder to be msg.sender */
    modifier ownsTicket(uint256 _ticketId){
        require(ticketsToOwner[_ticketId] == msg.sender, "You don't own the ticket.");
        _;
    }

  function getContractDeployer() public view returns (address) {
        return contractDeployer;
    }

    function getTicketCount() public view returns (uint256) {
        return tickets.length;
    }

    function balanceOf(address _owner) external view returns (uint256){
        return ownerToQuantity[_owner];
    }

    function ownerOf(uint256 _ticketId) external view returns (address){
        return ticketsToOwner[_ticketId];
    }

    /* 1st TIME PURCHASE FROM PLATFORM - this is called when 1st time buyer presses the 'Purchase' button */
    function transferFrom(address payable _from, address _to, uint256 _ticketId) external payable notSeller(_ticketId) {
        require(msg.value == (tickets[_ticketId].price)*1 ether, "Not enough money."); /* Requires buyer to pay the price of ticket */
        _from.transfer((tickets[_ticketId].price)*1 ether);
        ticketsToOwner[_ticketId] = _to;
        ownerToQuantity[_from]--;
        ownerToQuantity[_to]++;
        emit Transfer(_from, _to, _ticketId);
    }

    /* SECONDARY MARKET - a person looking to resell his/her ticket can only sell to a willing/approved buyer. This function is called by buyer. */
    function approve(address _approved, uint256 _ticketId) external payable notSeller(_ticketId){
        require(msg.value == (tickets[_ticketId].price)*1 ether, "Not enough money."); /* Requires buyer to pay the price of ticket */
        approvedBuyers[_ticketId] = _approved; /* Buyer approves him/herself for the ticket, goes into the approved buyer mapping */
        ticketIdToPending[_ticketId] = msg.value; /* Buyer's money gets stored in the contract, so we store it in a temp mapping */
        emit Approval(ticketsToOwner[_ticketId], _approved, _ticketId);
    }

    /* SECONDARY MARKET - after the buyer is approved, seller presses 'Sell' button, and then the ticket's ownership gets transferred. Seller also gets money from contract. */
    function transferAfterApproval(address payable _from, address _to, uint256 _ticketId) external payable ownsTicket(_ticketId) {
        require(approvedBuyers[_ticketId] == _to, "This is not an approved buyer."); /* Requires the transferee to be an approved buyer for the ticket */
        _from.transfer((ticketIdToPending[_ticketId])*1 ether); /* Money gets transferred from contract to seller */
        delete(ticketIdToPending[_ticketId]); /* Can be deleted as the mapping is no longer needed */
        delete(approvedBuyers[_ticketId]); /* Can be deleted as the mapping is no longer needed */
        ticketsToOwner[_ticketId] = _to;
        ownerToQuantity[_from]--;
        ownerToQuantity[_to]++;
        emit Transfer(_from, _to, _ticketId);
    }

}