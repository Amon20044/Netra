/** Discriminator codes for the package's typed errors. */
export type ArtifactErrorCode =
  | "ARTIFACT_PARSE_ERROR"
  | "STREAM_ERROR"
  | "CLASSIFICATION_ERROR";

export interface SerializedArtifactError {
  name: string;
  code: ArtifactErrorCode;
  message: string;
  recoverable: boolean;
}
