/**
 * RAG Validation
 * Validation schemas cho các API endpoints của RAG system
 */

import Joi from 'joi'

/**
 * Validation cho upload text
 */
const uploadText = async (req, res, next) => {
  const schema = Joi.object({
    text: Joi.string()
      .required()
      .min(10)
      .max(1000000)
      .trim()
      .messages({
        'string.empty': 'Text content is required',
        'string.min': 'Text must be at least 10 characters long',
        'string.max': 'Text must not exceed 1,000,000 characters',
        'any.required': 'Text content is required'
      }),
    
    metadata: Joi.object({
      title: Joi.string().max(200).trim(),
      category: Joi.string().max(100).trim(),
      description: Joi.string().max(1000).trim(),
      author: Joi.string().max(200).trim(),
      source: Joi.string().max(500).trim(),
      tags: Joi.array().items(Joi.string().max(50))
    }).optional(),
    
    collectionName: Joi.string()
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .max(100)
      .optional()
      .messages({
        'string.pattern.base': 'Collection name can only contain letters, numbers, hyphens, and underscores'
      })
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    })
  }
}

/**
 * Validation cho query
 */
const query = async (req, res, next) => {
  const schema = Joi.object({
    question: Joi.string()
      .required()
      .min(1)
      .max(1000)
      .trim()
      .messages({
        'string.empty': 'Question is required',
        'string.min': 'Question must be at least 1 character long',
        'string.max': 'Question must not exceed 1,000 characters',
        'any.required': 'Question is required'
      }),
    
    topK: Joi.number()
      .integer()
      .min(1)
      .max(20)
      .optional()
      .default(5)
      .messages({
        'number.base': 'topK must be a number',
        'number.min': 'topK must be at least 1',
        'number.max': 'topK must not exceed 20'
      }),
    
    collectionName: Joi.string()
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .max(100)
      .optional()
      .default('heritage_documents')
      .messages({
        'string.pattern.base': 'Collection name can only contain letters, numbers, hyphens, and underscores'
      })
  })

  try {
    const validated = await schema.validateAsync(req.body, { abortEarly: false })
    req.body = validated // Set defaults
    next()
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    })
  }
}

/**
 * Validation cho upload document (multipart)
 */
const uploadDocument = async (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().max(200).trim().optional(),
    category: Joi.string().max(100).trim().optional(),
    description: Joi.string().max(1000).trim().optional(),
    collectionName: Joi.string()
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .max(100)
      .optional()
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    })
  }
}

/**
 * Validation cho delete collection
 */
const deleteCollection = async (req, res, next) => {
  const schema = Joi.object({
    collectionName: Joi.string()
      .required()
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .max(100)
      .messages({
        'string.empty': 'Collection name is required',
        'string.pattern.base': 'Collection name can only contain letters, numbers, hyphens, and underscores',
        'any.required': 'Collection name is required'
      })
  })

  try {
    await schema.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    })
  }
}

export const ragValidation = {
  uploadText,
  query,
  uploadDocument,
  deleteCollection
}
