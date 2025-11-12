// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract CredChain is ERC721URIStorage, Ownable {
    struct Project {
        address client;
        string projectHash; // SHA-256 hex
        string link; // IPFS/GitHub link
        bool verified;
    }

    struct Review {
        address reviewer;
        uint projectIndex;  // link to userProjects[user][index]
        uint8 rating;
        string commentHash;
    }

    // --- Mappings ---
    mapping(address => bool) public verifiedUsers;
    mapping(address => Project[]) public userProjects;
    mapping(address => Review[]) public userReviews;
    mapping(address => uint256) public projectCount; // verified project counts
    mapping(string => bool) private _projectHashExists; // prevent duplicates

    uint256 public tokenCounter;

    event UserVerified(address indexed user, bool status);
    event ProjectAdded(address indexed user, uint index, string projectHash, string link);
    event ProjectVerified(address indexed user, uint index, bool status);
    event ReviewAdded(address indexed freelancer, address indexed reviewer, uint8 rating);

    constructor() ERC721("CredChainBadge", "CCB") Ownable() {
        tokenCounter = 1;
    }

    // ------------------------------------------------------------
    // User verification
    // ------------------------------------------------------------
    function setUserVerified(address user, bool status) external onlyOwner {
        verifiedUsers[user] = status;
        emit UserVerified(user, status);
    }

    // ------------------------------------------------------------
    // Project management
    // ------------------------------------------------------------
    function addProject(
        address user,
        address client,
        string calldata projectHash,
        string calldata link
    ) external  {
        require(verifiedUsers[user], "User not verified");
        require(!_projectHashExists[projectHash], "Project hash already exists");

        _projectHashExists[projectHash] = true;

        // Add project directly as verified
        userProjects[user].push(Project(client, projectHash, link, true));

        // Increment verified project count
        projectCount[user] += 1;

        // Check for milestone badge
        _checkAndMintBadge(user);

        emit ProjectAdded(user, userProjects[user].length - 1, projectHash, link);
        emit ProjectVerified(user, userProjects[user].length - 1, true);
    }


    // ------------------------------------------------------------
    // Review system
    // ------------------------------------------------------------
    function submitReview(
        address freelancer,
        uint projectIndex,
        uint8 rating,
        string calldata commentHash
    ) external {
        require(verifiedUsers[msg.sender], "Reviewer not verified");
        require(projectIndex < userProjects[freelancer].length, "Invalid project index");

        Project storage p = userProjects[freelancer][projectIndex];
        require(p.client == msg.sender, "Not authorized to review this project");

        // ✅ Prevent multiple reviews by the same client for same project
        for (uint i = 0; i < userReviews[freelancer].length; i++) {
            if (
                userReviews[freelancer][i].projectIndex == projectIndex &&
                userReviews[freelancer][i].reviewer == msg.sender
            ) {
                revert("Already reviewed this project");
            }
        }

        userReviews[freelancer].push(
            Review(msg.sender, projectIndex, rating, commentHash)
        );

        emit ReviewAdded(freelancer, msg.sender, rating);
    }

    // ------------------------------------------------------------
    // Get project + reviews
    // ------------------------------------------------------------
    function getProjectWithReviews(address user, uint index)
        external
        view
        returns (
            address client,
            string memory projectHash,
            string memory link,
            bool verified,
            Review[] memory reviews
        )
    {
        Project storage p = userProjects[user][index];

        // Count matching reviews
        uint count = 0;
        for (uint i = 0; i < userReviews[user].length; i++) {
            if (userReviews[user][i].projectIndex == index) {
                count++;
            }
        }

        Review[] memory matched = new Review[](count);
        uint j = 0;
        for (uint i = 0; i < userReviews[user].length; i++) {
            if (userReviews[user][i].projectIndex == index) {
                matched[j] = userReviews[user][i];
                j++;
            }
        }

        return (p.client, p.projectHash, p.link, p.verified, matched);
    }

    // ✅ NEW — Get all projects of a user (builder)
    function getAllProjects(address user) external view returns (Project[] memory) {
        return userProjects[user];
    }

    // ✅ NEW — Get all reviews of a user (freelancer)
    function getAllReviews(address user) external view returns (Review[] memory) {
        return userReviews[user];
    }

    // ------------------------------------------------------------
    // Badge logic
    // ------------------------------------------------------------
    function _checkAndMintBadge(address user) internal {
        uint256 count = projectCount[user];
        if (count == 3 || count == 5 || count == 7 || count == 10) {
            string memory uri = _getBadgeURI(count);
            _mintBadge(user, uri);
        }
    }

    function _mintBadge(address user, string memory uri) internal {
        uint256 newId = tokenCounter;
        _safeMint(user, newId);
        _setTokenURI(newId, uri);
        tokenCounter += 1;
    }

    function mintBadge(address user, string calldata uri) external onlyOwner {
        _mintBadge(user, uri);
    }

    function _getBadgeURI(uint256 milestone) internal pure returns (string memory) {
        if (milestone == 3) return "ipfs://QmBadge3";
        if (milestone == 5) return "ipfs://QmBadge5";
        if (milestone == 7) return "ipfs://QmBadge7";
        if (milestone == 10) return "ipfs://QmBadge10";
        return "";
    }

    // ------------------------------------------------------------
    // Convenience getters
    // ------------------------------------------------------------
    function getProject(address user, uint index)
        external
        view
        returns (address, string memory, string memory, bool)
    {
        Project storage p = userProjects[user][index];
        return (p.client, p.projectHash, p.link, p.verified);
    }

    function getProjectCount(address user) external view returns (uint) {
        return userProjects[user].length;
    }

    function getVerifiedProjectTCount(address user) external view returns (uint) {
        return projectCount[user];
    }
}
