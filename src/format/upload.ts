import { Upload } from "../buse/messages";

export function formatUploadTitle(u: Upload) {
  return u ? u.displayName || u.filename : "?";
}
