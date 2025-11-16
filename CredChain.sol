// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract CredChain is ERC721URIStorage, Ownable {
    struct Project {
        address client;           
        string projectName;       
        string description;       
        string languages;         
        string projectHash;       
        string link;              // GitHub/IPFS/other source link
        bool verified;            
        uint256 timestamp;        
    }

    struct ProjectInput {
        address user;
        address client;
        string projectName;
        string description;
        string languages;
        string projectHash;
        string link;
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
    function setUserVerified(address user, bool status) external  {
        verifiedUsers[user] = status;
        emit UserVerified(user, status);
    }

    function addProject(ProjectInput calldata p) external  {
        require(verifiedUsers[p.user], "User not verified");
        require(!_projectHashExists[p.projectHash], "Project exists");

        _projectHashExists[p.projectHash] = true;

        userProjects[p.user].push(
            Project(
                p.client,
                p.projectName,
                p.description,
                p.languages,
                p.projectHash,
                p.link,
                true,
                block.timestamp
            )
        );

        projectCount[p.user] += 1;
        _checkAndMintBadge(p.user);

        emit ProjectAdded(p.user, userProjects[p.user].length - 1, p.projectHash, p.link);
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

    function getReviewCount(address user) external view returns (uint) {
        return userReviews[user].length;
    }
    // ------------------------------------------------------------
    // Get project + reviews
    // ------------------------------------------------------------
    function getProjectReviews(address user, uint index)
        external
        view
        returns (Review[] memory reviews)
    {
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

        return matched;
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
        if (milestone == 3) return "ipfs://bafybeic2gtysvrlewxynwqbmsqktb3gdmiomrpawwr24oq7azotdd4fkgu/badge1.json";
        if (milestone == 5) return "ipfs://bafybeic2gtysvrlewxynwqbmsqktb3gdmiomrpawwr24oq7azotdd4fkgu/badge2.json";
        if (milestone == 7) return "ipfs://bafybeic2gtysvrlewxynwqbmsqktb3gdmiomrpawwr24oq7azotdd4fkgu/badge3.json";
        if (milestone == 10) return "ipfs://bafybeic2gtysvrlewxynwqbmsqktb3gdmiomrpawwr24oq7azotdd4fkgu/badge4.json";
        return "";
    }

    // ------------------------------------------------------------
    // Convenience getters
    // ------------------------------------------------------------
    function getProject(address user, uint index)
        external
        view
        returns (
            address client,
            string memory projectName,
            string memory description,
            string memory languages,
            string memory projectHash,
            string memory link,
            bool verified,
            uint256 timestamp
        )
    {
        Project storage p = userProjects[user][index];

        return (
            p.client,
            p.projectName,
            p.description,
            p.languages,
            p.projectHash,
            p.link,
            p.verified,
            p.timestamp
        );
    }


    function getProjectCount(address user) external view returns (uint) {
        return userProjects[user].length;
    }

    function getVerifiedProjectTCount(address user) external view returns (uint) {
        return projectCount[user];
    }
}
