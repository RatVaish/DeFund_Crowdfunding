// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Crowdfunding
 * @dev Decentralized crowdfunding platform with automatic fund distribution
 * @notice Supports campaign creation, contributions, withdrawals, and refunds
 */
contract Crowdfunding {

    // ==================== STATE VARIABLES ====================

    uint256 private campaignCounter;

    struct Campaign {
        address creator;
        string title;
        string description;
        uint256 goalAmount;
        uint256 deadline;
        uint256 amountRaised;
        bool withdrawn;
        bool exists;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    uint256[] public campaignIds;

    // ==================== EVENTS ====================

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 goalAmount,
        uint256 deadline
    );

    event ContributionReceived(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event FundsWithdrawn(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount
    );

    event RefundIssued(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    // ==================== MODIFIERS ====================

    modifier campaignExists(uint256 _campaignId) {
        require(campaigns[_campaignId].exists, "Campaign does not exist");
        _;
    }

    modifier campaignActive(uint256 _campaignId) {
        require(
            block.timestamp < campaigns[_campaignId].deadline,
            "Campaign has ended"
        );
        _;
    }

    modifier campaignEnded(uint256 _campaignId) {
        require(
            block.timestamp >= campaigns[_campaignId].deadline,
            "Campaign still active"
        );
        _;
    }

    modifier onlyCreator(uint256 _campaignId) {
        require(
            msg.sender == campaigns[_campaignId].creator,
            "Only campaign creator can call this"
        );
        _;
    }

    // ==================== CONSTRUCTOR ====================

    constructor() {
        campaignCounter = 0;
    }

    // ==================== MAIN FUNCTIONS ====================

    /**
     * @dev Creates a new crowdfunding campaign
     * @param _title Campaign title
     * @param _description Campaign description
     * @param _goalAmount Funding goal in wei
     * @param _durationInDays Campaign duration in days
     * @return campaignId The ID of the newly created campaign
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goalAmount,
        uint256 _durationInDays
    ) external returns (uint256) {
        require(_goalAmount > 0, "Goal amount must be greater than 0");
        require(_durationInDays > 0, "Duration must be at least 1 day");
        require(_durationInDays <= 365, "Duration cannot exceed 365 days");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");

        uint256 deadline = block.timestamp + (_durationInDays * 1 days);

        campaignCounter++;
        uint256 newCampaignId = campaignCounter;

        campaigns[newCampaignId] = Campaign({
            creator: msg.sender,
            title: _title,
            description: _description,
            goalAmount: _goalAmount,
            deadline: deadline,
            amountRaised: 0,
            withdrawn: false,
            exists: true
        });

        campaignIds.push(newCampaignId);

        emit CampaignCreated(
            newCampaignId,
            msg.sender,
            _title,
            _goalAmount,
            deadline
        );

        return newCampaignId;
    }

    /**
     * @dev Contribute ETH to a campaign
     * @param _campaignId The campaign to contribute to
     */
    function contribute(uint256 _campaignId)
        external
        payable
        campaignExists(_campaignId)
        campaignActive(_campaignId)
    {
        require(msg.value > 0, "Contribution must be greater than 0");

        Campaign storage campaign = campaigns[_campaignId];

        // Update contribution tracking
        contributions[_campaignId][msg.sender] += msg.value;

        // Update total amount raised
        campaign.amountRaised += msg.value;

        emit ContributionReceived(_campaignId, msg.sender, msg.value);
    }

    /**
     * @dev Withdraw funds if campaign goal was met
     * @param _campaignId The campaign to withdraw from
     */
    function withdrawFunds(uint256 _campaignId)
        external
        campaignExists(_campaignId)
        campaignEnded(_campaignId)
        onlyCreator(_campaignId)
    {
        Campaign storage campaign = campaigns[_campaignId];

        require(!campaign.withdrawn, "Funds already withdrawn");
        require(
            campaign.amountRaised >= campaign.goalAmount,
            "Funding goal not reached"
        );
        require(campaign.amountRaised > 0, "No funds to withdraw");

        // Mark as withdrawn BEFORE transfer (checks-effects-interactions pattern)
        campaign.withdrawn = true;

        uint256 amount = campaign.amountRaised;

        // Transfer funds to creator
        (bool success, ) = payable(campaign.creator).call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(_campaignId, campaign.creator, amount);
    }

    /**
     * @dev Get refund if campaign goal was not met
     * @param _campaignId The campaign to get refund from
     */
    function refund(uint256 _campaignId)
        external
        campaignExists(_campaignId)
        campaignEnded(_campaignId)
    {
        Campaign storage campaign = campaigns[_campaignId];

        require(
            campaign.amountRaised < campaign.goalAmount,
            "Campaign was successful, no refunds"
        );

        uint256 contributedAmount = contributions[_campaignId][msg.sender];
        require(contributedAmount > 0, "No contribution to refund");

        // Reset contribution BEFORE transfer (checks-effects-interactions pattern)
        contributions[_campaignId][msg.sender] = 0;

        // Transfer refund to contributor
        (bool success, ) = payable(msg.sender).call{value: contributedAmount}("");
        require(success, "Refund transfer failed");

        emit RefundIssued(_campaignId, msg.sender, contributedAmount);
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @dev Returns full details of a campaign
     * @param _campaignId The campaign ID to query
     * @return Campaign struct with all details
     */
    function getCampaign(uint256 _campaignId)
        external
        view
        campaignExists(_campaignId)
        returns (Campaign memory)
    {
        return campaigns[_campaignId];
    }

    /**
     * @dev Returns total number of campaigns created
     */
    function getTotalCampaigns() external view returns (uint256) {
        return campaignIds.length;
    }

    /**
     * @dev Returns contribution amount for a specific contributor
     * @param _campaignId The campaign ID
     * @param _contributor The contributor address
     */
    function getContribution(uint256 _campaignId, address _contributor)
        external
        view
        returns (uint256)
    {
        return contributions[_campaignId][_contributor];
    }

    /**
     * @dev Checks if campaign goal was reached
     * @param _campaignId The campaign ID to check
     */
    function isGoalReached(uint256 _campaignId)
        public
        view
        campaignExists(_campaignId)
        returns (bool)
    {
        return campaigns[_campaignId].amountRaised >= campaigns[_campaignId].goalAmount;
    }

    /**
     * @dev Returns array of all campaign IDs
     */
    function getAllCampaignIds() external view returns (uint256[] memory) {
        return campaignIds;
    }

    /**
     * @dev Returns contract balance (should normally be 0 after all operations)
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
