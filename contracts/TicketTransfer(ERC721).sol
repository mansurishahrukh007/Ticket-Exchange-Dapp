pragma solidity >=0.4.21 <0.6.0;

import "./TicketCreation.sol";
import "./erc721.sol";

contract TicketTransfer is TicketCreation, ERC721 {

    event Transfer(address indexed _from, address indexed _to, uint256 indexed _ticketId);
    event Approval(address indexed _owner, address indexed _approved, uint256 indexed _ticketId);

    mapping (address => uint256) public addressToPendingStake; /* Mapping of seller address to staked amount */
    mapping (address => uint256) public addressToPendingPrice; /* Mapping of seller address to ticket price */
    mapping (uint256 => uint256) ticketToDeliveryDate; /* Mapping of bought ticks to delivery date */

    uint256 date;

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

    function balanceOf(address _owner) external view returns (uint256){
        return ownerToQuantity[_owner];
    }

    function ownerOf(uint256 _ticketId) external view returns (address){
        return ticketsToOwner[_ticketId];
    }

    function approve(address _approved, uint256 _ticketId) external payable ownsTicket(_ticketId){
        require(tickets[_ticketId].available == true, "This ticket ID is not available for sale.");
        approvedBuyers[_ticketId] = _approved;
        emit Approval(ticketsToOwner[_ticketId], _approved, _ticketId);
    }

    function transferFrom(address _from, address _to, uint256 _ticketId) external payable notSeller(_ticketId) {
        require(approvedBuyers[_ticketId] == _to, "You are not approved.");
        require(msg.value == (tickets[_ticketId].price)*1 ether, "Not enough money."); /* Requires buyer to pay the price of ticket */
        ticketsToOwner[_ticketId] = _to;
        ownerToQuantity[_from]--;
        ownerToQuantity[_to]++;
        tickets[_ticketId].available = false;
        addressToPendingStake[_from] = ((tickets[_ticketId].price)*1 ether)/stakingFactor;
        addressToPendingPrice[_from] = (tickets[_ticketId].price)*1 ether;
        emit Transfer(_from, _to, _ticketId);
    }

    function confirmDeliveredDate(uint256 _ticketId) internal ownsTicket(_ticketId) {
        date = now;
        ticketToDeliveryDate[_ticketId] = date;
    }

    /* Below function is called by buyer when ticket is received and confirmed valid by buyer */
    function confirmValid(address payable _from, uint256 _ticketId) external payable ownsTicket(_ticketId) {
        require(addressToPendingPrice[_from] > 0, "There is no pending money to be received."); /* Requires there to be unreleased money */
        require(msg.sender == ticketsToOwner[_ticketId], "You did not purchase this ticket."); /* Only the buyer can confirm ticket validity */
        _from.transfer(addressToPendingPrice[_from]); /* Price gets released to seller after buyer confirmation*/
        _from.transfer(addressToPendingStake[_from]); /* Stake gets released to seller after buyer confirmation*/
        delete(addressToPendingPrice[_from]); /* Removes the item from mapping, gas refund */
        delete(addressToPendingStake[_from]); /* Removes the item from mapping, gas refund */
    }

    /* Below function can be called by seller when ticket is not confirmed by buyer within 14 days of delivery */
    function autoConfirmValid(address payable _from, uint256 _ticketId) external payable {
        require(addressToPendingPrice[_from] > 0, "There is no pending money to be received."); /* Requires there to be unreleased money */
        require(now > (ticketToDeliveryDate[_ticketId] + 10 days), "You need to wait longer."); /* Requires more than 14 days */
        _from.transfer(addressToPendingPrice[_from]); /* Price gets released to seller after auto confirmation */
        _from.transfer(addressToPendingStake[_from]); /* Stake gets released to seller after auto confirmation */
        delete(addressToPendingPrice[_from]); /* Removes the item from mapping, gas refund */
        delete(addressToPendingStake[_from]); /* Removes the item from mapping, gas refund */
    }

    /* ADD FUNCTION FOR REFUND IF INVALID TICKET */

    /* Below function is called when the buyer wants to resell the ticket after purchase */
    function resell(uint16 _newPrice, uint256 _ticketId) external payable ownsTicket (_ticketId) returns(string memory, string memory, bool, uint16){
        staking(_newPrice);
        tickets[_ticketId].available = true; /* As the ticket is being resold, it becomes available for sale */
        tickets[_ticketId].price = _newPrice; /* New price is set for the ticket */
        return (tickets[_ticketId].eventName, tickets[_ticketId].description, tickets[_ticketId].available, tickets[_ticketId].price);
    }
}