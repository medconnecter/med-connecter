const { sqsClient } = require('../../config/aws.config');
const {
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  CreateQueueCommand
} = require('@aws-sdk/client-sqs');

class SQSService {
  constructor() {
    this.queueUrl = process.env.AWS_SQS_QUEUE_URL;
  }

  // Create a new SQS queue
  async createQueue(queueName) {
    const command = new CreateQueueCommand({
      QueueName: queueName,
      Attributes: {
        DelaySeconds: '0',
        MessageRetentionPeriod: '86400' // 24 hours
      }
    });

    const response = await sqsClient.send(command);
    return response.QueueUrl;
  }

  // Send message to queue
  async sendMessage(messageBody, delaySeconds = 0) {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: typeof messageBody === 'string' ? messageBody : JSON.stringify(messageBody),
      DelaySeconds: delaySeconds
    });

    return await sqsClient.send(command);
  }

  // Receive messages from queue
  async receiveMessages(maxMessages = 10) {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: 20 // Long polling
    });

    return await sqsClient.send(command);
  }

  // Delete message from queue
  async deleteMessage(receiptHandle) {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle
    });

    return await sqsClient.send(command);
  }

  // Process messages with a callback
  async processMessages(callback, maxMessages = 10) {
    const response = await this.receiveMessages(maxMessages);
    
    if (!response.Messages) {
      return;
    }

    for (const message of response.Messages) {
      try {
        await callback(message);
        await this.deleteMessage(message.ReceiptHandle);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    }
  }
}

module.exports = new SQSService(); 