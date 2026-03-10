// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ZKPVerifier
 * @notice Groth16 zero-knowledge proof verifier.
 * @dev Generated following the snarkjs Groth16 pattern.
 *      The verification key embedded here corresponds to the accessProof circuit.
 *      For production, regenerate this contract with:
 *        snarkjs zkey export solidityverifier accessProof_final.zkey ZKPVerifier.sol
 */
contract ZKPVerifier {
    // ─────────────────────────── Verification Key ────────────────────────

    // BN128 curve order
    uint256 constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    // Verification key components (placeholder values for local Hardhat dev;
    // replace with real values after running: snarkjs zkey export verificationkey)
    uint256[2] public alpha1 = [
        20491192805390485299153009773594534940189261866228447918068658471970481763042,
        9383485363053290200918347156157836566562967994039712273449902621266178545958
    ];
    uint256[2][2] public beta2 = [
        [
            4252822878758300859123897981450591353533073413197771768651442665752259397132,
            6375614351688725206403948262868962793625744043794305715222011528459656738731
        ],
        [
            21847035105528745403288232691147584728191162732299865338377159692350059136679,
            10505242626370262277552901082094356697409835680220590971873171140371331206856
        ]
    ];
    uint256[2][2] public gamma2 = [
        [
            11559732032986387107991004021392285783925812861821192530917403151452391805634,
            10857046999023057135944570762232829481370756359578518086990519993285655852781
        ],
        [
            4082367875863433681332203403145435568316851327593401208105741076214120093531,
            8495653923123431417604973247489272438418190587263600148770280649306958101930
        ]
    ];
    uint256[2][2] public delta2 = [
        [
            11559732032986387107991004021392285783925812861821192530917403151452391805634,
            10857046999023057135944570762232829481370756359578518086990519993285655852781
        ],
        [
            4082367875863433681332203403145435568316851327593401208105741076214120093531,
            8495653923123431417604973247489272438418190587263600148770280649306958101930
        ]
    ];
    uint256[2][] public IC;

    constructor() {
        IC.push([
            16502541702892540025497476617042684808553605649680360583100813832936924990064,
            8174524980741737326826395949052490340958945869019754466217898481607376785793
        ]);
        IC.push([
            10957416839691822819012695920476680484285649990870640660891001527836399779878,
            15028854680547063025060695948428052741427668027775682565718603847892523082736
        ]);
    }

    // ─────────────────────────── Pairing Logic ───────────────────────────

    struct G1Point {
        uint256 X;
        uint256 Y;
    }

    struct G2Point {
        uint256[2] X;
        uint256[2] Y;
    }

    function negate(G1Point memory p) internal pure returns (G1Point memory) {
        if (p.X == 0 && p.Y == 0) return G1Point(0, 0);
        return G1Point(p.X, SNARK_SCALAR_FIELD - (p.Y % SNARK_SCALAR_FIELD));
    }

    function addition(G1Point memory p1, G1Point memory p2)
        internal
        view
        returns (G1Point memory r)
    {
        uint256[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0x80, r, 0x40)
        }
        require(success, "ZKP: G1 addition failed");
    }

    function scalar_mul(G1Point memory p, uint256 s)
        internal
        view
        returns (G1Point memory r)
    {
        uint256[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x60, r, 0x40)
        }
        require(success, "ZKP: scalar mul failed");
    }

    function pairing(G1Point[] memory p1, G2Point[] memory p2)
        internal
        view
        returns (bool)
    {
        require(p1.length == p2.length, "ZKP: pairing length mismatch");
        uint256 elements = p1.length;
        uint256 inputSize = elements * 6;
        uint256[] memory input = new uint256[](inputSize);
        for (uint256 i = 0; i < elements; i++) {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[0];
            input[i * 6 + 3] = p2[i].X[1];
            input[i * 6 + 4] = p2[i].Y[0];
            input[i * 6 + 5] = p2[i].Y[1];
        }
        uint256[1] memory out;
        bool success;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            success := staticcall(
                sub(gas(), 2000),
                8,
                add(input, 0x20),
                mul(inputSize, 0x20),
                out,
                0x20
            )
        }
        require(success, "ZKP: pairing check failed");
        return out[0] != 0;
    }

    // ─────────────────────────── Public API ──────────────────────────────

    /**
     * @notice Verify a Groth16 proof.
     * @param a       Proof element A (G1 point).
     * @param b       Proof element B (G2 point).
     * @param c       Proof element C (G1 point).
     * @param input   Public inputs (1 element: e.g. file hash or user commitment).
     * @return bool   True if the proof is valid.
     */
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[1] memory input
    ) public view returns (bool) {
        G1Point memory vk_x = G1Point(IC[0][0], IC[0][1]);

        for (uint256 i = 0; i < input.length; i++) {
            require(input[i] < SNARK_SCALAR_FIELD, "ZKP: input out of range");
            vk_x = addition(
                vk_x,
                scalar_mul(G1Point(IC[i + 1][0], IC[i + 1][1]), input[i])
            );
        }

        G1Point[] memory p1 = new G1Point[](4);
        G2Point[] memory p2 = new G2Point[](4);

        p1[0] = negate(G1Point(a[0], a[1]));
        p2[0] = G2Point(b[0], b[1]);
        p1[1] = G1Point(alpha1[0], alpha1[1]);
        p2[1] = G2Point(beta2[0], beta2[1]);
        p1[2] = vk_x;
        p2[2] = G2Point(gamma2[0], gamma2[1]);
        p1[3] = G1Point(c[0], c[1]);
        p2[3] = G2Point(delta2[0], delta2[1]);

        return pairing(p1, p2);
    }

    /**
     * @notice Convenience: verify and revert on failure.
     */
    function verifyProofStrict(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[1] memory input
    ) external view {
        require(verifyProof(a, b, c, input), "ZKP: invalid proof");
    }
}
