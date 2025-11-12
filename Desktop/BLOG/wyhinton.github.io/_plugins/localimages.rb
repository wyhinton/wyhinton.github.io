Jekyll::Hooks.register :posts, :post_render do |post|
    post.output.gsub!('<img src="../assets/images', '<img src="/assets/images/')
  end