pragma solidity >=0.4.21 <0.6.0;

contract TicketCreation {

  /* Emit events when new accounts and new tickets have been created */
  event NewAccount(uint256 indexed userId, string indexed firstName, string indexed lastName);
  event NewTicket(uint256 indexed ticketId, string indexed eventName, string indexed description, bool available, uint16 price);

  /* Struct for User */
  struct User {
    address userAd;
    string firstName;
    string lastName;
  }

  /* Struct for Ticket, ticket ID is stored in a mapping below in ticketsToOwner */
  struct Ticket {
    string eventName;
    string description;
    bool available;
    uint16 price;
  }

  /* Determines how much ether a seller should stake */
  uint16 stakingFactor = 4;

  User[] users; /* Array of Users */
  Ticket[] public tickets; /* Array of Tickets */

  /* Maps address to user ID */
  mapping (address => uint256) adToUserId;
  /* Maps ticket IDs to user addresses */
  mapping (uint256 => address) ticketsToOwner;
  /* Maps users to their number of tickets held */
  mapping (address => uint16) ownerToQuantity;
  /* Maps ticket IDs to approved buyers */
  mapping (uint256 => address) approvedBuyers;

  function staking(uint16 _price) internal {
      uint256 stakeAmount = _price * 1 ether/stakingFactor;
      require(msg.value == stakeAmount, "Your staking amount is incorrect."); /* Requires seller to stake ether */
  }

  function accountCreation(string calldata _firstName, string calldata _lastName) external {
    uint256 userId = users.push(User(msg.sender, _firstName, _lastName));
    adToUserId[msg.sender] = userId;
    emit NewAccount(userId, _firstName, _lastName); /* Event emitter */
  }

  function createTicket(string calldata _eventName, string calldata _description, uint16 _price) external payable {
    require(adToUserId[msg.sender] > 0, "Please create an account first."); /* Requires user to have an account */
    staking(_price);
    // uint256 stakeAmount = _price * 1 ether / stakingFactor;
    //require(msg.value == stakeAmount, "Your staking amount is incorrect."); /* Requires seller to stake ether */
    uint256 ticketId = tickets.push(Ticket(_eventName, _description, true, _price))-1;
    ticketsToOwner[ticketId] = msg.sender;
    ownerToQuantity[msg.sender]++;
    emit NewTicket(ticketId, _eventName, _description, true, _price); /* Event emitter */
  }

}