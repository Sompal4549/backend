import Razorpay from 'razorpay';
import { config } from './app.config';

let instance: InstanceType<typeof Razorpay> | null = null;

export const getRazorpayInstance = (): InstanceType<typeof Razorpay> => {
  if (!instance) {
    if (!config.razorpayKeyId || !config.razorpayKeySecret) {
      throw new Error('Razorpay API key and secret must be configured in environment variables');
    }
    instance = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    });
  }
  return instance;
};
