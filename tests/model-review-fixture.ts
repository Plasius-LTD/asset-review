// Synthetic canonical fixture adapted from asset-contracts contract tests.
import { MODEL_CONFIRMATION_VIEW_KINDS, MODEL_CANDIDATE_HARD_GATE_KINDS,
  createModelRequestSpec, createModelAssetRef, createModelMatchAssessment,
  createModelCandidate, type ModelCandidate } from "@plasius/asset-contracts";
const hash = (character: string): string => character.repeat(64);

const createRequest = () =>
  createModelRequestSpec({
    query: "  weathered oak farmhouse table  ",
    revision: 0,
    locale: "en-gb",
    rankerId: "semantic-model-ranker",
    hardConstraints: {
      boundsMetres: {
        min: [-1, 0, -0.5],
        max: [1, 1, 0.5],
      },
      dimensionsMetres: {
        width: 2,
        height: 1,
        depth: 1,
      },
      maxTriangles: 80_000,
      maxBytes: 40_000_000,
      maxTextureBytes: 16_000_000,
      maxTextureDimensionPx: 4096,
      maxPartitionCellMetres: 2,
      lod: "required",
      collision: "required",
      partition: "allowed",
    },
    softPreferences: {
      category: "furniture",
      style: "rustic",
      materials: ["oak", "iron"],
      colors: ["brown"],
      era: "victorian",
      condition: "weathered",
      tags: ["farmhouse", "dining"],
    },
    exclusions: ["modern plastic", "glass top"],
  });

const technicalProfile = {
  boundsMetres: {
    min: [-1, 0, -0.5],
    max: [1, 1, 0.5],
  },
  dimensionsMetres: {
    width: 2,
    height: 1,
    depth: 1,
  },
  triangleCount: 64_000,
  byteLength: 24_000_000,
  textureByteLength: 8_000_000,
  maxTextureDimensionPx: 4096,
  lodCount: 4,
  hasCollision: true,
  partitionCount: 1,
  partitionCellMetres: 2,
};

const childAsset = createModelAssetRef({
  assetId: "oak-table-top",
  version: "2026.07.12-a1",
  kind: "leaf",
  contentHash: hash("c"),
  runtimeManifestUri: "mcp://models/catalog/oak-table-top/versions/2026.07.12-a1/manifest",
});

const createViews = () =>
  MODEL_CONFIRMATION_VIEW_KINDS.map((kind, index) => ({
    kind,
    imageUri: `mcp://models/resolutions/resolution-1/candidates/candidate-1/${kind}.png`,
    sha256: hash(String(index + 1)),
    contentType: "image/png",
    width: 1024,
    height: 1024,
  }));

const createMatch = () =>
  createModelMatchAssessment({
    score: 0.91,
    hardConstraintPass: true,
    reasonCodes: ["semantic-category-match", "within-runtime-budget"],
    ranker: {
      id: "semantic-model-ranker",
      version: "1.2.0",
      calibrationId: "catalog-2026-07",
      calibrationVersion: "1",
      evidenceMode: "multimodal",
      assuranceCeiling: "high",
    },
    exactMatch: false,
    fidelityWarnings: ["source material names were normalized"],
    request: createRequest(),
    candidateId: "candidate-1",
    candidateContentHash: hash("a"),
  });

const createProcessingManifest = () => ({
  manifestId: "model-processing.candidate-1.v1",
  resolutionId: "resolution-1",
  candidateId: "candidate-1",
  kind: "assembly",
  contentHash: hash("a"),
  closureHash: hash("f"),
  technicalProfile,
  lods: [0, 1, 2, 3].map((level) => ({
    level,
    resource: {
      uri: `mcp://models/resolutions/resolution-1/candidates/candidate-1/lod${level}.glb`,
      byteLength: level === 0 ? technicalProfile.byteLength : Math.floor(12_000_000 / (2 ** (level - 1))),
      sha256: level === 0 ? hash("a") : hash(String(level + 4)),
      contentType: "model/gltf-binary",
    },
    triangleCount: 64_000 / (2 ** level),
    geometricErrorMetres: level === 0 ? 0 : 0.01 * (2 ** (level - 1)),
  })),
  collision: {
    kind: "convex-hull",
    resource: {
      uri: "mcp://models/resolutions/resolution-1/candidates/candidate-1/collision.glb",
      byteLength: 32_000,
      sha256: hash("8"),
      contentType: "model/gltf-binary",
    },
  },
  collisionPolicy: {
    profileId: "static-world-collision",
    profileVersion: "1",
    disposition: "proxy-required",
    category: "furniture",
    decisionToken: "collision_policy_token_0123456789abcdef",
  },
  children: [
    {
      instanceId: "table-top",
      assetRef: childAsset,
      transform: {
        translationMetres: [0, 0.75, 0],
        rotationQuaternion: [0, 0, 0, 1],
        scale: [1, 1, 1],
      },
    },
  ],
  converter: {
    id: "canonical-model-converter",
    version: "1.0.0",
    sourceFormat: "obj",
    targetFormat: "glb",
    sourceContentHash: hash("e"),
    outputContentHash: hash("a"),
    diagnostics: [
      {
        severity: "warning",
        code: "material-name-normalized",
        message: "Material names were normalized for runtime packaging.",
      },
    ],
    losses: [
      {
        code: "unsupported-source-metadata",
        severity: "info",
        message: "One non-runtime metadata field was omitted.",
      },
    ],
  },
  fidelityEvidence: [
    {
      aspect: "geometry",
      outcome: "preserved",
      message: "Canonical geometry remained within the requested dimensions and triangle budget.",
      evidenceResource: {
        uri: "mcp://models/resolutions/resolution-1/candidates/candidate-1/fidelity.json",
        byteLength: 1024,
        sha256: hash("9"),
        contentType: "application/json",
      },
    },
    {
      aspect: "materials",
      outcome: "preserved",
      message: "Runtime materials were preserved.",
    },
    {
      aspect: "textures",
      outcome: "preserved",
      message: "Runtime textures were preserved.",
    },
  ],
  fidelityGate: {
    profileId: "static-world-fidelity",
    profileVersion: "1",
    outcome: "passed",
    requiredAspects: ["geometry", "materials", "textures"],
    evaluatedAt: "2026-07-12T12:10:00.000Z",
    decisionToken: "fidelity_gate_token_0123456789abcdef",
  },
  processedAt: "2026-07-12T12:10:00.000Z",
});

const createCandidate = () =>
  createModelCandidate({
    resolutionId: "resolution-1",
    candidateId: "candidate-1",
    assetRef: {
      disposition: "proposed",
      proposalId: "proposal-1",
      kind: "assembly",
      contentHash: hash("a"),
    },
    match: createMatch(),
    provenance: {
      kind: "provider",
      sourceId: "polyhaven",
      sourceAssetId: "oak-table-42",
      sourcePageUri: "https://polyhaven.com/a/oak-table-42",
      contentHash: hash("e"),
      capturedAt: "2026-07-12T12:00:00.000Z",
    },
    rights: {
      decisionId: "rights-decision-1",
      decisionToken: "rights_decision_token_0123456789abcdef",
      policyId: "catalog-rights-v1",
      policyVersion: "1",
      sourceId: "polyhaven",
      sourceAssetId: "oak-table-42",
      sourceContentHash: hash("e"),
      status: "allowed",
      licenseId: "CC0-1.0",
      evidencePageUri: "https://polyhaven.com/license",
      reviewedAt: "2026-07-12T12:05:00.000Z",
    },
    technicalProfile,
    processingManifest: createProcessingManifest(),
    views: createViews(),
    renderEvidence: {
      renderId: "render-1",
      rendererId: "plasius-runtime-renderer",
      rendererVersion: "1.0.0",
      settingsId: "canonical-model-four-view",
      settingsVersion: "1",
      processingManifestId: "model-processing.candidate-1.v1",
      sourceContentHash: hash("a"),
      viewSha256s: createViews().map((view) => view.sha256),
      renderedAt: "2026-07-12T12:10:00.000Z",
      attestationToken: "render_attestation_token_0123456789abcdef",
    },
    hardGates: MODEL_CANDIDATE_HARD_GATE_KINDS.map((kind, index) => ({
      kind,
      outcome: "passed",
      validatorId: `${kind}-validator`,
      validatorVersion: "1.0.0",
      subjectContentHash: kind === "malware-scan" ? hash("e") : hash("f"),
      reasonCodes: [],
      evaluatedAt: "2026-07-12T12:10:00.000Z",
      attestationToken: `hard_gate_token_${index}_0123456789abcdef`,
    })),
    confirmationToken: "confirmation_token_0123456789abcdef",
  });

export const confirmationInput = (candidate = createCandidate()) => ({
  confirmationId: "confirmation-1",
  resolutionId: "resolution-1",
  candidateId: candidate.candidateId,
  confirmationToken: candidate.confirmationToken,
  viewSha256s: candidate.views.map((view) => view.sha256),
  confirmedBy: "requester-42",
  confirmedAt: "2026-07-12T12:15:00.000Z",
  semanticRiskAccepted: false,
});


type Mutable<T> = { -readonly [K in keyof T]: T[K] extends object ? Mutable<T[K]> : T[K] };
export function candidateInput(): Mutable<ModelCandidate> {
  return structuredClone(createCandidate()) as Mutable<ModelCandidate>;
}
