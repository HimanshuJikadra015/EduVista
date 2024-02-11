import { Document, Model, Schema, model } from "mongoose";

interface faqItem extends Document {
  question: string;
  answer: string;
}

interface category extends Document {
  title: string;
}

interface bannerImage extends Document {
  public_id: string;
  url: string;
}

interface layout extends Document {
  type: string;
  faq: faqItem[];
  categories: category[];
  banner: {
    images: bannerImage;
    title: string;
    subTitle: string;
  };
}

const faqSchema = new Schema<faqItem>({
  question: { type: String },
  answer: { type: String },
});

const categorySchema = new Schema<category>({
  title: { type: String },
});

const bannerImageSchema = new Schema<bannerImage>({
  public_id: { type: String },
  url: { type: String },
});

const layoutSchema = new Schema<layout>({
  type: { type: String },
  faq: [faqSchema],
  categories: [categorySchema],
  banner: {
    image: bannerImageSchema,
    title: { type: String },
    subTitle: { type: String },
  },
});

const LayoutModel = model<layout>("Layout", layoutSchema);
export default LayoutModel;
