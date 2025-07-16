const { snsClient } = require('../../config/aws.config');
const { 
  PublishCommand,
  CreateTopicCommand,
  SubscribeCommand
} = require('@aws-sdk/client-sns');

class SNSService {
  constructor() {
    this.topicArn = process.env.AWS_SNS_TOPIC_ARN;
  }

  // Create a new SNS topic
  async createTopic(topicName) {
    const command = new CreateTopicCommand({
      Name: topicName
    });

    const response = await snsClient.send(command);
    return response.TopicArn;
  }

  // Subscribe an endpoint to the topic
  async subscribe(protocol, endpoint) {
    const command = new SubscribeCommand({
      TopicArn: this.topicArn,
      Protocol: protocol, // 'email', 'sms', 'https', etc.
      Endpoint: endpoint
    });

    return await snsClient.send(command);
  }

  // Send notification
  async publish(message, subject = null) {
    const params = {
      Message: typeof message === 'string' ? message : JSON.stringify(message),
      TopicArn: this.topicArn
    };

    if (subject) {
      params.Subject = subject;
    }

    const command = new PublishCommand(params);
    return await snsClient.send(command);
  }

  // Send SMS directly (without topic)
  async sendSMS(phoneNumber, message) {
    const command = new PublishCommand({
      Message: message,
      PhoneNumber: phoneNumber
    });

    return await snsClient.send(command);
  }
}

module.exports = new SNSService(); 