import { badRequest } from "../../../utils/httpError.js";
import { UpdateQuestionDTO } from "../forms.schemas.js";

export function normalizeQuestionUpdate(currentType: "text" | "checkbox" | "radio", dto: UpdateQuestionDTO) {
  const nextType = dto.type ?? currentType;
  const isText = nextType === "text";

  // Rules that depend on nextType
  if (nextType === "radio") {
    // If user provided values, they must be 1
    if (dto.minChoices !== undefined && dto.minChoices !== 1) throw badRequest("radio questions must have minChoices = 1");
    if (dto.maxChoices !== undefined && dto.maxChoices !== 1) throw badRequest("radio questions must have maxChoices = 1");
  }

  if (isText) {
    // disallow setting choices for text
    if (dto.minChoices !== undefined || dto.maxChoices !== undefined) {
      throw badRequest("minChoices/maxChoices are not allowed for text questions");
    }
  }

  const data: any = {
    ...(dto.prompt !== undefined ? { prompt: dto.prompt } : {}),
    ...(dto.type !== undefined ? { type: dto.type } : {}),
    ...(dto.isRequired !== undefined ? { isRequired: dto.isRequired } : {}),
    ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
  };

  if (isText) {
    data.minChoices = null;
    data.maxChoices = null;
  } else {
    if (dto.minChoices !== undefined) data.minChoices = dto.minChoices;
    if (dto.maxChoices !== undefined) data.maxChoices = dto.maxChoices;
    // Optional: auto-fix radio if client omitted fields
    // if (nextType === "radio") { data.minChoices ??= 1; data.maxChoices ??= 1; }
  }

  const shouldDeleteOptions = isText; // if switching to text, options must be removed

  return { nextType, isText, data, shouldDeleteOptions };
}
