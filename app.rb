# -*- coding: utf-8 -*-
require 'sinatra/base'
require 'rack/csrf'
require 'fb_graph'
require 'json'
require 'RMagick'
require 'imlib2'
require 'base64'
require 'securerandom'


class DfmApp < Sinatra::Base

  configure do
    APP_KEY, APP_SECRET = File.open(".key").read.split
    use Rack::Session::Cookie,
    :key => 'dfm.session',
    #:domain => 't-forget.me',
    #:path => '/',
    :expire_after => 3600,
    :secret => SecureRandom.hex(32)
    use Rack::Csrf, :raise => true
  end

  helpers do
    def csrf_token
      Rack::Csrf.csrf_token(env)
    end
    
    def csrf_tag
      Rack::Csrf.csrf_tag(env)
    end
  end

  error do
    "sorry"
  end
  
  not_found do
    "404"
  end

  get '/' do
    @page_name = ""
    @page_js = "<script type='text/javascript' src='js/index.js'></script>"
    @app_key = APP_KEY
    erb :index
  end

  get '/session' do
    session[:session_id]
    #"#{session[:token]}\n#{session.empty?}"
  end

  get '/edit' do
    # セッションのチェック
    if session[:token].nil?
      redirect '/auth'
    end

    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}:#{request.port}/auth/callback"

    begin
      me = FbGraph::User.me session[:token] 
      me.fetch
    rescue
      redirect '/auth'
    end
    
    if(!me.permissions.include?(:user_photos) || !me.permissions.include?(:friends_photos))
      redirect '/auth'
    end

    @page_name = "写真作成 | "
    @page_js = "<script type='text/javascript' src='js/dfm.js'></script>"
    erb :edit
  end
  
  get '/finished' do
    @page_name = "投稿完了 | "
    @app_key = APP_KEY
    erb :finished
  end

  #facebook認証
  get '/auth' do
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}:#{request.port}/auth/callback"
    redirect auth.client.authorization_uri(:scope => [:user_photos, :friends_photos, :photo_upload])
  end

  #facebook認証のコールバック
  get '/auth/callback' do
    #facebookからのcodeが無かったらトップに戻る
    if params[:code].nil?
      redirect '/'
    end

    #codeをセット
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}:#{request.port}/auth/callback"
    client = auth.client
    client.authorization_code = params[:code]
    
    #アクセストークンを取得
    begin
      access_token = client.access_token! :client_auth_body
      session[:token] = access_token.access_token
      #画像生成用のディレクトリを生成
      session_id = session[:session_id]
      path = "./public/files/#{session_id}"
      FileUtils.mkdir_p(path) unless FileTest.exist?(path)
    rescue
      redirect '/'
    end

    redirect '/edit'
  end

  # 友達リストを取得
  # Return:: json
  post '/friends.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    friends = user.friends({"locale" => "ja_JP"})
    content_type :json
    friends = friends.to_a.map{|friend|
      {
        "id" => friend.identifier,
        "name" => friend.name, 
        "picture" => friend.picture({"&width=" => "34", "&height=" => "34"}),
      }
    }
    friends.unshift({"id" => user.identifier, "name" => user.name, "picture" => user.picture({"&width=" => "34", "&height=" => "34"})})
    content_type :json
    friends.to_json
  end

  # アルバムリストを取得
  # Return:: json
  post '/albums.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    tagged = user.photos({"type" => "tagged", "limit" => 1})[0].source
    albums = user.albums({"locale" => "ja_JP"})
    albums = albums.to_a.map{|album|
      {
        "id" => album.identifier,
        "name" => album.name,
        "source" => album.cover_photo.nil? ? nil : album.cover_photo.fetch(:access_token => session[:token]).source,
      }
    }
    albums.unshift({"id" => 0, "name" => "あなたが写っている写真", "source" => tagged, "tags" => Array::new})
    content_type :json
    albums.to_json
  end

  # 自分のタグが付いた写真を取得
  # Return:: json
  post '/tagged_photos.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    photos = user.photos({"type" => "tagged"})
    photos = photos.to_a.map{|photo|
      {
        "id" => photo.identifier,
        "name" => photo.name.nil? ? "無題" : photo.name,
        "source" => photo.source,
      }
    }
    content_type :json
    photos.to_json
  end

  # アルバムの写真を取得
  # Param:: params[:id](アルバムID)
  # Return:: json
  post '/photos.json' do
    id = params[:id]
    album = FbGraph::Album.new(id, :access_token => session[:token]).fetch
    
    photos = album.photos.to_a.map{|photo|
      {
        "id" => photo.identifier,
        "name" => photo.name.nil? ? "無題" : photo.name,
        "source" => photo.source,
      }
    }
    content_type :json
    photos.to_json
  end

  # 欠席者の写真を取得
  # Param:: params[:id](欠席者のFacebookID)
  # Return:: json
  post '/absentee.json' do
    id = params[:id]
    user = FbGraph::User.new(id, :access_token => session[:token]).fetch({"fields" => "picture.width(100).height(120)"})
    fb_url = user.raw_attributes["picture"]["data"]["url"]
    session_id = session[:session_id]
    filename = SecureRandom.hex(16)
    url = "/files/#{session_id}/#{filename}.png"
    dir = "./public#{url}"

    begin
      absentee = Magick::ImageList.new(fb_url)
      if(absentee.columns != 100 || absentee.rows != 120)
        absentee = absentee.resize_to_fill(100, 120)
      end
      mask = Magick::ImageList.new("./masks/mask_oval.png")
      mask.alpha = Magick::ActivateAlphaChannel
      masked = mask.composite(absentee, 0, 0, Magick::SrcInCompositeOp)

=begin
      masked.background_color = "black"
      shadow = masked.shadow(5, 5, 3, 0.4)
      shadowed = shadow.composite(masked, 0, 0, Magick::OverCompositeOp)
=end   

      masked.write(dir)
      
      picture = {"source" => url}
      content_type :json
      picture.to_json
    rescue => exc
      content_type :json
      exc.to_json
    end
  end

  # 写真を取得
  # Param:: params[:id](写真ID)
  # Return:: json
  post '/photo.json' do
    id = params[:id]
    photo = FbGraph::Photo.new(id, :access_token => session[:token]).fetch
    session_id = session[:session_id]

    fb_url = photo.source
    filename = SecureRandom.hex(16)
    url = "/files/#{session_id}/#{filename}.jpg"
    dir = "./public#{url}"
    img = Magick::ImageList.new(fb_url)

    #横幅が800より大きかったら比率維持して縮小
    if(img.columns > 800)
      img = img.resize_to_fit(800, 0)
    end

    img.write(dir)

    res = {
      "source" => url,
      "width" => img.columns,
      "height" => img.rows,
      "tags" => photo.tags.to_a.map{|tag|
        {
          "id" => tag.user.identifier,
          "x" => tag.x,
          "y" => tag.y
        } if tag.user != nil
      }
    }

    content_type :json
    res.to_json
  end

  # 既に追加されている出席・欠席者に対してそれぞれ共通の友達を取得し合計を計算する
  # Param:: params[:absences](既に追加されている欠席者のFacebookID), params[:tags](出席者のFacebookID), params[:id](追加する欠席者のFacebookID)
  # Return:: json
  post '/closely.json' do
    #既に追加されている欠席者
    absences = params[:absences].nil? ? Array::new : params[:absences]
    #タグ付けされたユーザのID
    tags = params[:tags].nil? ? Array::new : params[:tags]
    #追加する欠席者のID
    id = params[:id]

    #ユーザを取得
    me = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})

    closely = Hash::new

    mutuals = me.mutual_friends(id).to_a.map{|friend|
      friend.identifier
    }
    
    absences.each{|absence|
      friends = me.mutual_friends(absence)
      friends.each{|friend|
        if(mutuals.include?(friend.identifier))
          if closely["#{friend.identifier}"].nil?
            closely["#{friend.identifier}"] = 1
          else
            closely["#{friend.identifier}"] += 1
          end
        end
      }
    }

    tags.each{|tag|
      friends = me.mutual_friends(tag)
      friends.each{|friend|
        if(mutuals.include?(friend.identifier))
          if closely["#{friend.identifier}"].nil?
            closely["#{friend.identifier}"] = 1
          else
            closely["#{friend.identifier}"] += 1
          end
        end
      }
    }

    content_type :json
    closely.to_json
  end

  # 欠席者を合成した写真を作成
  # Param:: params[:absences](欠席者の写真urlと座標), params[:photo](ベースの写真url)
  # Return:: json
  post '/create.json' do
    
    absences = params[:absences].nil? ? Hash::new : params[:absences]
    session_id = session[:session_id]
    filename = SecureRandom.hex(16)
    url = "/files/#{session_id}/photo_#{filename}.jpg"
    dir = "./public#{url}"

    # ディレクトリが無かったら作る
    FileUtils.mkdir_p("./public/files/#{session_id}") unless FileTest.exist?("./public/files/#{session_id}")

    if(false)
      photo = Magick::ImageList.new("./public#{params[:photo]}")

      for i in 0..(absences["x"].nil? ? -1 : absences["x"].size-1)
        absence = Magick::ImageList.new("./public#{absences["src"][i]}")
        photo = photo.composite(absence, absences["x"][i].to_i, absences["y"][i].to_i, Magick::OverCompositeOp)
      end

      photo.write(dir){
        self.quality = 95
      }
    else
      photo = Imlib2::Image.load("./public#{params[:photo]}")

      for i in 0..(absences["x"].nil? ? -1 : absences["x"].size-1)
        absentee = Imlib2::Image.load("./public#{absences["src"][i]}")
        photo = photo.blend(absentee, 0, 0, absentee.width, absentee.height, absences["x"][i].to_i, absences["y"][i].to_i, absentee.width, absentee.height, false)
      end

      photo.attach_value("quality", 95)
      photo.save(dir)
    end

    session[:upload_flag] = true;

    json = {
      "path" => url,
    }

    content_type :json
    json.to_json
  end

  # 作成した写真をFacebookに投稿する
  # Param:: params[:url](合成写真のurl), params[:name](タグ名), params[:x](タグのx座標), params[:y](タグのy座標), params[:message](コメント)
  post '/upload' do
    if(session[:upload_flag])
      dir = "./public#{params[:url]}"
      photo = Magick::ImageList.new(dir)
      tags = Array::new
      
      if(params[:use_tag] == "tag")
        if(!params[:id].nil? && !params[:x].nil? && !params[:y].nil?)
          for i in 0..(params[:id].size-1)
            tags.append(FbGraph::Tag.new(:name => "#{params[:id][i]}", :x => (params[:x][i].to_f+50) / photo.columns * 100, :y => (params[:y][i].to_f+60) / photo.rows * 100))
          end
        end
        if(!params[:attendee_id].nil? && !params[:attendee_x].nil? && !params[:attendee_y].nil?)
          for i in 0..(params[:attendee_id].size-1)
            tags.append(FbGraph::Tag.new(:name => "#{params[:attendee_id][i]}", :x => params[:attendee_x][i], :y => params[:attendee_y][i]))
          end
        end
      end

      message = "#{params[:message]}\n--------------------------------\n休んだ人も写真に入れてあげましょう。\nDon't forget me!!!\n・http://don.t-forget.me\n--------------------------------"

      user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
      user.photo!(:source => File.new(dir), :message => message, :tags => tags)
    
      # ファイルを削除
      #File.delete(session[:path]) if File.exist?(session[:path])

      session[:upload_flag] = false
      result = "success"
    else
      result = "error"
    end

    content_type :json
    result.to_json
  end
end
