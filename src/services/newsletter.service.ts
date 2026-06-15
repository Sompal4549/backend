import { SubscriberModel } from '../models/subscriber.model';
import { BlogModel } from '../models/blog.model'; // Assuming BlogModel exists
import { sendEmail } from './email.service'; // sendEmail is already imported

export const subscribeUser = async (email: string) => {
  const existing = await SubscriberModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
      return existing;
    }
    throw new Error('You are already subscribed to our newsletter!');
  }

  const subscriber = await SubscriberModel.create({ email });

  // Confirmation Email (Aap email.service mein ek generic sendEmail function bana sakte hain)
  const subject = 'Welcome to Ensis Wellness Newsletter!';
  const plainTextMessage = `Hello,\n\nThank you for subscribing to Ensis Wellness newsletter! You will now receive updates on our latest blogs and products.\n\nRegards,\nThe Ensis Team`;
  const htmlMessage = `
    <p>Hello,</p>
    <p>Thank you for subscribing to <strong>Ensis Wellness</strong> newsletter! You will now receive updates on our latest blogs and products.</p>
    <p>Stay healthy and happy!</p>
    <p>Regards,<br/>The Ensis Team</p>
    <p><a href="https://ensis.in" style="color: #007bff; text-decoration: none;">Visit our website</a></p>
  `;

  try {
    await sendEmail(email, subject, plainTextMessage, htmlMessage);
  } catch (err) {
    console.error('Email sending failed', err);
  }

  return subscriber;
};

export const getSubscribers = async () => {
  return await SubscriberModel.find().sort({ createdAt: -1 });
};

export const sendBlogToEmails = async (blogId: string, emails: string[]) => {
  const blog = await BlogModel.findById(blogId);
  if (!blog) {
    throw new Error('Blog not found');
  }

  const blogUrl = `https://ensis.in/blog/${blog.slug}`;
  const subject = `Recommended Read: ${blog.title}`;
  const plainText = `Hello,\n\nOur Admin has recommended this blog post for you: "${blog.title}".\n\nYou can read it here: ${blogUrl}\n\nRegards,\nThe Ensis Team`;
  
  const htmlContent = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #007bff;">Recommended Read: ${blog.title}</h2>
      <p>Hello,</p>
      <p>Our Admin thought you might find this blog post interesting:</p>
      <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #007bff; background: #f8f9fa;">
        <strong>${blog.title}</strong>
      </div>
      <p><a href="${blogUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Read Full Blog</a></p>
      <p>Regards,<br/>The Ensis Team</p>
    </div>
  `;

  const emailPromises = emails.map(email => 
    sendEmail(email.trim(), subject, plainText, htmlContent).catch(err => console.error(`Error sending to ${email}:`, err.message))
  );

  await Promise.all(emailPromises);
};

export const notifySubscribers = async (blogTitle: string, blogSlug: string) => {
  const subscribers = await SubscriberModel.find({ isActive: true });
  const blogUrl = `https://ensis.in/blog/${blogSlug}`;
  const subject = `New Blog Post: ${blogTitle}`;
  const plainText = `Hello,\n\nWe have just published a new blog post: "${blogTitle}".\n\nYou can read it here: ${blogUrl}\n\nStay tuned for more updates!\n\nRegards,\nThe Ensis Team`;

  const htmlContent = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #28a745;">New Blog Published!</h2>
      <p>Hello,</p>
      <p>We've just added a new blog post: <strong>${blogTitle}</strong></p>
      <p><a href="${blogUrl}" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: #fff; text-decoration: none; border-radius: 5px;">Click Here to Read</a></p>
      <p>Stay tuned for more wellness updates!</p>
      <p>Regards,<br/>The Ensis Team</p>
    </div>
  `;

  // Ek saath saare emails bhejane ke liye Promise.all use kar sakte hain
  const emailPromises = subscribers.map(sub => 
    sendEmail(sub.email, subject, plainText, htmlContent).catch(err => {
      console.error(`Failed to notify ${sub.email}:`, err.message);
    })
  );

  await Promise.all(emailPromises);
  console.log(`Notification sent to ${subscribers.length} subscribers.`);
};