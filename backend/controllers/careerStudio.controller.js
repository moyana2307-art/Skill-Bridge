// CV, cover letter, and mock interview endpoints.
const careerStudioService = require('../services/careerStudio.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

async function generateCv(req, res) {
  const cv = await careerStudioService.generateCv(req.user.id, req.validated.body);
  return sendSuccess(res, {
    statusCode: 201,
    data: { cv },
    message: 'CV generated',
  });
}

async function listCvs(req, res) {
  const cvs = await careerStudioService.listCvs(req.user.id);
  return sendSuccess(res, { data: { cvs } });
}

async function getCv(req, res) {
  const { cvId } = req.validated.params;
  const cv = await careerStudioService.getCv(req.user.id, cvId);
  if (!cv) throw ApiError.notFound(`CV ${cvId} was not found`);
  return sendSuccess(res, { data: { cv } });
}

async function updateCv(req, res) {
  const { cvId } = req.validated.params;
  const cv = await careerStudioService.updateCv(
    req.user.id,
    cvId,
    req.validated.body
  );
  if (!cv) throw ApiError.notFound(`CV ${cvId} was not found`);
  return sendSuccess(res, { data: { cv }, message: 'CV updated' });
}

async function removeCv(req, res) {
  const { cvId } = req.validated.params;
  const deleted = await careerStudioService.deleteCv(req.user.id, cvId);
  if (!deleted) throw ApiError.notFound(`CV ${cvId} was not found`);
  return sendSuccess(res, { data: { cv_id: cvId }, message: 'CV deleted' });
}

async function analyzeCv(req, res) {
  const { cvId } = req.validated.params;
  const result = await careerStudioService.analyzeCv(
    req.user.id,
    cvId,
    req.validated.body
  );
  if (!result) throw ApiError.notFound(`CV ${cvId} was not found`);
  return sendSuccess(res, { data: result, message: 'CV review ready' });
}

async function createCoverLetter(req, res) {
  const coverLetter = await careerStudioService.generateCoverLetter(
    req.user.id,
    req.validated.body
  );
  return sendSuccess(res, {
    statusCode: 201,
    data: { cover_letter: coverLetter },
    message: 'Cover letter generated',
  });
}

async function listCoverLetters(req, res) {
  const coverLetters = await careerStudioService.listCoverLetters(req.user.id);
  return sendSuccess(res, { data: { cover_letters: coverLetters } });
}

async function removeCoverLetter(req, res) {
  const { coverLetterId } = req.validated.params;
  const deleted = await careerStudioService.deleteCoverLetter(
    req.user.id,
    coverLetterId
  );
  if (!deleted) throw ApiError.notFound(`Cover letter ${coverLetterId} was not found`);
  return sendSuccess(res, {
    data: { cover_letter_id: coverLetterId },
    message: 'Cover letter deleted',
  });
}

async function startInterview(req, res) {
  const interview = await careerStudioService.startInterview(
    req.user.id,
    req.validated.body
  );
  return sendSuccess(res, {
    statusCode: 201,
    data: { interview },
    message: 'Mock interview started',
  });
}

async function listInterviews(req, res) {
  const interviews = await careerStudioService.listInterviews(req.user.id);
  return sendSuccess(res, { data: { interviews } });
}

async function getInterview(req, res) {
  const { interviewId } = req.validated.params;
  const interview = await careerStudioService.getInterview(
    req.user.id,
    interviewId
  );
  if (!interview) throw ApiError.notFound(`Interview ${interviewId} was not found`);
  return sendSuccess(res, { data: { interview } });
}

async function answerQuestion(req, res) {
  const { interviewId } = req.validated.params;
  const result = await careerStudioService.answerQuestion(
    req.user.id,
    interviewId,
    req.validated.body
  );

  if (result.status === 'not_found') {
    throw ApiError.notFound(`Interview ${interviewId} was not found`);
  }
  if (result.status === 'question_not_found') {
    throw ApiError.notFound('That interview question was not found');
  }

  return sendSuccess(res, { data: result, message: 'Answer reviewed' });
}

async function completeInterview(req, res) {
  const { interviewId } = req.validated.params;
  const interview = await careerStudioService.completeInterview(
    req.user.id,
    interviewId
  );
  if (!interview) throw ApiError.notFound(`Interview ${interviewId} was not found`);
  return sendSuccess(res, {
    data: { interview },
    message: 'Mock interview completed',
  });
}

async function removeInterview(req, res) {
  const { interviewId } = req.validated.params;
  const deleted = await careerStudioService.deleteInterview(
    req.user.id,
    interviewId
  );
  if (!deleted) throw ApiError.notFound(`Interview ${interviewId} was not found`);
  return sendSuccess(res, {
    data: { interview_id: interviewId },
    message: 'Mock interview deleted',
  });
}

module.exports = {
  generateCv,
  listCvs,
  getCv,
  updateCv,
  removeCv,
  analyzeCv,
  createCoverLetter,
  listCoverLetters,
  removeCoverLetter,
  startInterview,
  listInterviews,
  getInterview,
  answerQuestion,
  completeInterview,
  removeInterview,
};
