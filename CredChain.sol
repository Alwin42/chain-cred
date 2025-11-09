// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract CredChain is ERC721URIStorage, Ownable {
    struct Project {
        address client;
        string projectHash; // SHA-256 hex
        string link;        // IPFS/GitHub link
        bool verified;
    }

    struct Review {
        address reviewer;
        uint8 rating;
        string commentHash; // could be IPFS
    }

    mapping(string => bool) private _verifiedProjects;// Tracks if a project (by its projectHash) has been verified.
    mapping(address => mapping(string => bool)) private _hasReviewed;    // Tracks if a (reviewer, projectHash) pair has already submitted a review.

    mapping(address => bool) public verifiedUsers;
    mapping(address => Project[]) public userProjects;
    mapping(address => Review[]) public userReviews;
    mapping(address => uint256) public projectCount; // verified project counts

    uint256 public tokenCounter;

    event UserVerified(address indexed user, bool status);
    event ProjectAdded(address indexed user, uint index, string projectHash, string link);
    event ProjectVerified(address indexed user, uint index, string projectHash); 
    event ReviewAdded(address indexed freelancer, address indexed reviewer, uint8 rating);

  constructor() ERC721("CredChainBadge", "CCB") Ownable(msg.sender) {
    tokenCounter = 1;
    }

    // Admin/back-end calls to set a user as verified (after off-chain verification)
    function setUserVerified(address user, bool status) external onlyOwner {
        verifiedUsers[user] = status;
        emit UserVerified(user, status);
    }

    // Add project (backend should call this after computing hash)
    function addProject(address user, address client,string calldata projectHash, string calldata link) external onlyOwner {
    require(verifiedUsers[user], "User not verified");
    userProjects[user].push(Project(client, projectHash, link, false));
    emit ProjectAdded(user, userProjects[user].length - 1, projectHash, link);
}


    // Backend (verifier) sets project verified flag
    function verifyProject(address user, uint index, bool status) external onlyOwner {
        require(index < userProjects[user].length, "Invalid index");
        
        Project storage p = userProjects[user][index];
        
        // --- Duplicate Check: Project Verification ---
        require(!_verifiedProjects[p.projectHash], "Project already verified");

        p.verified = status;
        
        if (status) {
            // Mark project hash as verified universally
            _verifiedProjects[p.projectHash] = true; 
            
            projectCount[user] += 1;
            _checkAndMintBadge(user);
        }
        // NOTE: If we allow 'status=false' calls, we should decide if it should clear _verifiedProjects
        // For simplicity and preventing double-counting, we only set 'true' and don't allow un-verification.
        
        emit ProjectVerified(user, index, p.projectHash);
    }

    // Clients (verified) submit reviews; reviewer must be verified user
    function submitReview(address freelancer, string calldata projectHash, uint8 rating, string calldata commentHash) external {
        // We now require the projectHash to check verification and duplicate reviews
        require(verifiedUsers[msg.sender], "Reviewer not verified");
        
        // --- Duplicate Check: Project Verification ---
        require(_verifiedProjects[projectHash], "Project not verified");
        
        // --- Duplicate Check: Reviewer already reviewed this project ---
        require(!_hasReviewed[msg.sender][projectHash], "Reviewer already reviewed this project");

        // Record the review
        userReviews[freelancer].push(Review(msg.sender, rating, commentHash));
        
        // Mark the (reviewer, projectHash) pair as reviewed
        _hasReviewed[msg.sender][projectHash] = true;
        
        emit ReviewAdded(freelancer, msg.sender, rating);
    }

    // Internal badge logic — auto-mint on milestones
    function _checkAndMintBadge(address user) internal {
        uint256 count = projectCount[user];
        if (count == 3 || count == 5 || count == 7 || count == 10) {
            string memory uri = _getBadgeURI(count);
            _mintBadge(user, uri);
        }
    }

    // Mint badge to user
    function _mintBadge(address user, string memory uri) internal {
        uint256 newId = tokenCounter;
        _safeMint(user, newId);
        _setTokenURI(newId, uri);
        tokenCounter += 1;
    }

    // Owner can mint badges manually when needed
    function mintBadge(address user, string calldata uri) external onlyOwner {
        _mintBadge(user, uri);
    }

    // Configure URIs for milestones (dev: replace IPFS with real URIs)
    function _getBadgeURI(uint256 milestone) internal pure returns (string memory) {
        if (milestone == 3) return "ipfs://bafybeia7z2tn7uk7dsimsp3mfgnmrveocbirll7msiczyf6k2kbod7zpoa"; //Tried adding the IPFS link here !!!
        if (milestone == 5) return "ipfs://QmBadge5";
        if (milestone == 7) return "ipfs://QmBadge7";
        if (milestone == 10) return "ipfs://QmBadge10";
        return "";
    }

    // Convenience getters
    function getProject(address user, uint index) external view returns (address,string memory, string memory, bool) {
        Project storage p = userProjects[user][index];
        return (p.client,p.projectHash, p.link, p.verified);
    }

    function getProjectCount(address user) external view returns (uint) {
        return userProjects[user].length;
    }

    function getVerifiedProjectCount(address user) external view returns (uint) {
        return projectCount[user];
    }
}